using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;
using System.Threading;

namespace WorkflowBackend.Tests;

public class ContractsControllerTests
{
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

    private static ContractsController CreateController(AppDbContext context)
    {
        var controller = new ContractsController(context, new FakeWebHostEnvironment(), NullLogger<ContractsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        return controller;
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
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
}
