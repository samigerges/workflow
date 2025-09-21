using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;
using System.Threading;
using System.Reflection;
using System.Runtime.Serialization;
using System.Text;
using System.IO;

namespace WorkflowBackend.Tests;

public class ContractsControllerTests
{
    [Fact]
    public async Task CreateForm_SavesPdfUploadsAndReturnsDownloadUrl()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);
        var tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempRoot);

        try
        {
            var environment = new FakeWebHostEnvironment(tempRoot);
            var controller = CreateController(context, environment);

            await using var pdfStream = new MemoryStream(Encoding.UTF8.GetBytes("%PDF-1.4 workflow test"));
            var formFile = new FormFile(pdfStream, 0, pdfStream.Length, "contractFile", "uploaded-contract.pdf")
            {
                Headers = new HeaderDictionary(),
                ContentType = "application/pdf"
            };

            var result = await controller.CreateForm(
                title: "PDF contract",
                description: null,
                requestId: null,
                supplierName: null,
                quantity: null,
                cargoType: null,
                countryOfOrigin: null,
                pricePerTon: null,
                paymentMethod: null,
                shippingMethod: null,
                contractTerms: null,
                startDate: null,
                endDate: null,
                reviewNotes: null,
                file: formFile);

            var created = Assert.IsType<CreatedAtActionResult>(result.Result);
            var payload = Assert.IsType<ContractResponse>(created.Value);

            Assert.Equal("uploaded-contract.pdf", payload.FileName);
            Assert.NotNull(payload.FileUrl);
            Assert.Contains("/uploads/contracts/", payload.FileUrl!);

            var savedContract = await context.Contracts.SingleAsync();
            Assert.Equal("uploaded-contract.pdf", savedContract.FileName);
            Assert.False(string.IsNullOrWhiteSpace(savedContract.FilePath));

            var expectedPath = Path.Combine(
                environment.WebRootPath ?? tempRoot,
                savedContract.FilePath.Replace("/", Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal));

            Assert.True(File.Exists(expectedPath));
        }
        finally
        {
            if (Directory.Exists(tempRoot))
            {
                Directory.Delete(tempRoot, recursive: true);
            }
        }
    }

    [Fact]
    public async Task CreateJson_PersistsVeryLongNarratives()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);
        var longText = new string('x', Contract.NarrativeMaxLength);
        var reviewText = new string('y', Contract.ReviewNotesMaxLength);

        var request = new ContractCreateRequest(
            Title: "Long contract",
            Description: longText,
            RequestId: null,
            SupplierName: "Supplier",
            Quantity: 100,
            CargoType: "Bulk",
            CountryOfOrigin: "USA",
            PricePerTon: null,
            PaymentMethod: "Wire",
            ShippingMethod: "Sea",
            ContractTerms: longText,
            StartDate: null,
            EndDate: null,
            ReviewNotes: reviewText
        );

        var result = await controller.CreateJson(request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<ContractResponse>(created.Value);
        Assert.Equal(Contract.NarrativeMaxLength, payload.Description?.Length);
        Assert.Equal(Contract.NarrativeMaxLength, payload.ContractTerms?.Length);
        Assert.Equal(Contract.ReviewNotesMaxLength, payload.ReviewNotes?.Length);
    }

    [Fact]
    public async Task CreateJson_ReturnsFriendlyError_WhenRelatedRequestDisappearsDuringSave()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var requestId = Guid.NewGuid();

        await using (var setupContext = new AppDbContext(options))
        {
            await setupContext.Database.EnsureCreatedAsync();
            setupContext.Requests.Add(new Request { Id = requestId, Title = "Source request" });
            await setupContext.SaveChangesAsync();
        }

        await using var context = new ConcurrencyAwareAppDbContext(options, requestId);
        var controller = CreateController(context);

        var createRequest = new ContractCreateRequest(
            Title: "Contract referencing missing request",
            Description: null,
            RequestId: requestId,
            SupplierName: null,
            Quantity: null,
            CargoType: null,
            CountryOfOrigin: null,
            PricePerTon: null,
            PaymentMethod: null,
            ShippingMethod: null,
            ContractTerms: null,
            StartDate: null,
            EndDate: null,
            ReviewNotes: null
        );

        var result = await controller.CreateJson(createRequest);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var payload = badRequest.Value;
        var message = payload?.GetType().GetProperty("message")?.GetValue(payload) as string;

        Assert.Equal(
            "The related record referenced by this contract no longer exists. Please refresh and try again.",
            message);
    }

    [Fact]
    public async Task CreateJson_ReturnsFriendlyError_WhenSqlServerForeignKeyViolationOccurs()
    {
        var dbException = new DbUpdateException(
            "Database update failed",
            CreateSqlException(547, "The INSERT statement conflicted with the FOREIGN KEY constraint 'FK_Contracts_Requests'."));

        await using var context = CreateThrowingContext(dbException);
        var controller = CreateController(context);

        var result = await controller.CreateJson(CreateMinimalContractRequest());

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var payload = badRequest.Value;
        var message = payload?.GetType().GetProperty("message")?.GetValue(payload) as string;

        Assert.Equal(
            "The related record referenced by this contract no longer exists. Please refresh and try again.",
            message);
    }

    [Fact]
    public async Task CreateJson_ReturnsFriendlyError_WhenSqlServerStringLengthViolationOccurs()
    {
        var errorMessage = "String or binary data would be truncated in table 'dbo.Contracts', column 'title'.";
        var dbException = new DbUpdateException(
            "Database update failed",
            CreateSqlException(2628, errorMessage));

        await using var context = CreateThrowingContext(dbException);
        var controller = CreateController(context);

        var result = await controller.CreateJson(CreateMinimalContractRequest());

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var payload = badRequest.Value;
        var message = payload?.GetType().GetProperty("message")?.GetValue(payload) as string;

        Assert.Equal("The value for Title exceeds the maximum length of 200 characters.", message);
    }

    private static ContractsController CreateController(AppDbContext context, IWebHostEnvironment? environment = null)
    {
        var controller = new ContractsController(context, environment ?? new FakeWebHostEnvironment(), NullLogger<ContractsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var request = controller.ControllerContext.HttpContext.Request;
        request.Scheme = "https";
        request.Host = new HostString("test.local");

        return controller;
    }

    private static ContractCreateRequest CreateMinimalContractRequest() => new(
        Title: "SQL Contract",
        Description: null,
        RequestId: null,
        SupplierName: null,
        Quantity: null,
        CargoType: null,
        CountryOfOrigin: null,
        PricePerTon: null,
        PaymentMethod: null,
        ShippingMethod: null,
        ContractTerms: null,
        StartDate: null,
        EndDate: null,
        ReviewNotes: null);

    private static AppDbContext CreateThrowingContext(Exception exception)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ThrowingAppDbContext(options, exception);
    }

    private static SqlException CreateSqlException(int errorNumber, string message)
    {
        var sqlExceptionType = typeof(SqlException);
        var assembly = sqlExceptionType.Assembly;
        var namespacePrefix = sqlExceptionType.Namespace ?? "Microsoft.Data.SqlClient";

        var errorCollectionType = assembly.GetType($"{namespacePrefix}.SqlErrorCollection")
            ?? throw new InvalidOperationException("SqlErrorCollection type not found.");
        var errorType = assembly.GetType($"{namespacePrefix}.SqlError")
            ?? throw new InvalidOperationException("SqlError type not found.");

        var errorCollection = CreateSqlErrorCollection(errorCollectionType);
        var sqlError = CreateSqlError(errorType, errorNumber, message);

        var addMethod = errorCollectionType.GetMethod("Add", BindingFlags.NonPublic | BindingFlags.Instance)
            ?? throw new InvalidOperationException("SqlErrorCollection.Add method not found.");
        addMethod.Invoke(errorCollection, new[] { sqlError });

        foreach (var method in sqlExceptionType.GetMethods(BindingFlags.NonPublic | BindingFlags.Static))
        {
            if (!string.Equals(method.Name, "CreateException", StringComparison.Ordinal))
                continue;

            var parameters = method.GetParameters();
            var args = new object?[parameters.Length];
            var assignedCollection = false;

            for (var i = 0; i < parameters.Length; i++)
            {
                var parameter = parameters[i];
                var parameterType = parameter.ParameterType;

                if (parameterType.IsInstanceOfType(errorCollection))
                {
                    args[i] = errorCollection;
                    assignedCollection = true;
                }
                else if (parameterType == typeof(string))
                {
                    args[i] = "11.0.0";
                }
                else if (parameterType == typeof(Guid))
                {
                    args[i] = Guid.Empty;
                }
                else if (parameterType == typeof(bool))
                {
                    args[i] = false;
                }
                else if (parameterType == typeof(Exception))
                {
                    args[i] = null;
                }
                else if (parameterType.IsValueType)
                {
                    args[i] = Activator.CreateInstance(parameterType);
                }
                else
                {
                    args[i] = null;
                }
            }

            if (!assignedCollection)
            {
                continue;
            }

            var created = method.Invoke(null, args);
            if (created is SqlException sqlException)
            {
                return sqlException;
            }
        }

        throw new InvalidOperationException("Unable to create SqlException instance.");
    }

#pragma warning disable SYSLIB0050
    private static object CreateSqlErrorCollection(Type errorCollectionType)
    {
        try
        {
            return Activator.CreateInstance(errorCollectionType, nonPublic: true)!;
        }
        catch
        {
            return FormatterServices.GetUninitializedObject(errorCollectionType);
        }
    }

    private static object CreateSqlError(Type errorType, int number, string message)
    {
        foreach (var ctor in errorType.GetConstructors(BindingFlags.NonPublic | BindingFlags.Instance))
        {
            var parameters = ctor.GetParameters();
            var args = new object?[parameters.Length];
            var canUse = true;

            for (var i = 0; i < parameters.Length; i++)
            {
                var parameter = parameters[i];
                var parameterType = parameter.ParameterType;
                var name = parameter.Name ?? string.Empty;

                if (parameterType == typeof(int))
                {
                    args[i] = name.Contains("number", StringComparison.OrdinalIgnoreCase) ? number : 0;
                }
                else if (parameterType == typeof(byte))
                {
                    args[i] = (byte)0;
                }
                else if (parameterType == typeof(string))
                {
                    if (name.Contains("message", StringComparison.OrdinalIgnoreCase))
                    {
                        args[i] = message;
                    }
                    else if (name.Contains("server", StringComparison.OrdinalIgnoreCase))
                    {
                        args[i] = "server";
                    }
                    else if (name.Contains("procedure", StringComparison.OrdinalIgnoreCase))
                    {
                        args[i] = "procedure";
                    }
                    else
                    {
                        args[i] = message;
                    }
                }
                else if (parameterType == typeof(Guid))
                {
                    args[i] = Guid.Empty;
                }
                else if (parameterType == typeof(Exception))
                {
                    args[i] = null;
                }
                else if (parameterType == typeof(uint))
                {
                    args[i] = (uint)0;
                }
                else if (parameterType.IsValueType)
                {
                    args[i] = Activator.CreateInstance(parameterType);
                }
                else
                {
                    args[i] = null;
                }
            }

            try
            {
                return ctor.Invoke(args);
            }
            catch
            {
                canUse = false;
            }

            if (canUse)
            {
                break;
            }
        }

        throw new InvalidOperationException("Unable to create SqlError instance.");
    }
#pragma warning restore SYSLIB0050

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public FakeWebHostEnvironment(string? rootPath = null)
        {
            rootPath ??= Path.GetTempPath();
            WebRootPath = rootPath;
            ContentRootPath = rootPath;
        }

        public string ApplicationName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; }
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class ConcurrencyAwareAppDbContext : AppDbContext
    {
        private readonly Guid _requestId;
        private bool _deleted;

        public ConcurrencyAwareAppDbContext(DbContextOptions<AppDbContext> options, Guid requestId)
            : base(options)
        {
            _requestId = requestId;
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (!_deleted)
            {
                _deleted = true;
                await Database.ExecuteSqlRawAsync("DELETE FROM \"Requests\" WHERE \"Id\" = {0}", _requestId);
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }

    private sealed class ThrowingAppDbContext : AppDbContext
    {
        private readonly Exception _exception;

        public ThrowingAppDbContext(DbContextOptions<AppDbContext> options, Exception exception)
            : base(options)
        {
            _exception = exception;
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            => Task.FromException<int>(_exception);
    }
}
