using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
using System;
using System.Collections.Generic;
using System.Linq;

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

            Assert.Matches(@"^2025/W/\d+$", payload.PublicId);
            Assert.Equal(0, payload.SequenceNumber);
            Assert.Equal("uploaded-contract.pdf", payload.FileName);
            Assert.NotNull(payload.FileUrl);
            Assert.Contains("/uploads/contracts/", payload.FileUrl!);

            var savedContract = await context.Contracts.SingleAsync();
            Assert.Equal(payload.PublicId, savedContract.PublicId);
            Assert.Equal(payload.SequenceNumber, savedContract.SequenceNumber);
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
        Assert.Matches(@"^2025/W/\d+$", payload.PublicId);
        Assert.Equal(0, payload.SequenceNumber);
        Assert.Equal(Contract.NarrativeMaxLength, payload.Description?.Length);
        Assert.Equal(Contract.NarrativeMaxLength, payload.ContractTerms?.Length);
        Assert.Equal(Contract.ReviewNotesMaxLength, payload.ReviewNotes?.Length);
    }

    [Fact]
    public async Task CreateJson_AllowsLinkWhenRequestFieldsMatch()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var requestId = Guid.NewGuid();

        await using (var setupContext = new AppDbContext(options))
        {
            setupContext.Requests.Add(new Request
            {
                Id = requestId,
                PublicId = "2025/W/1",
                SequenceNumber = 1,
                SupplierName = "Acme Corp",
                Quantity = 100,
                CargoType = "Wheat",
                CountryOfOrigin = "USA",
                PricePerTon = 50m,
                PaymentMethod = "LC - 180 days",
                ShippingMethod = "Sea",
                StartDate = new DateTime(2025, 1, 1),
                EndDate = new DateTime(2025, 2, 1)
            });
            await setupContext.SaveChangesAsync();
        }

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var createRequest = new ContractCreateRequest(
            Title: "Linked contract",
            Description: null,
            RequestId: requestId,
            SupplierName: "Acme Corp",
            Quantity: 100,
            CargoType: "Wheat",
            CountryOfOrigin: "USA",
            PricePerTon: 50m,
            PaymentMethod: "LC - 180 days",
            ShippingMethod: "Sea",
            ContractTerms: null,
            StartDate: new DateTime(2025, 1, 1),
            EndDate: new DateTime(2025, 2, 1),
            ReviewNotes: null
        );

        var result = await controller.CreateJson(createRequest);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<ContractResponse>(created.Value);
        Assert.Equal(requestId, payload.RequestId);
        Assert.Equal("Linked contract", payload.Title);
    }

    [Fact]
    public async Task CreateJson_ReturnsBadRequest_WhenRequestFieldsMismatch()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var requestId = Guid.NewGuid();

        await using (var setupContext = new AppDbContext(options))
        {
            setupContext.Requests.Add(new Request
            {
                Id = requestId,
                PublicId = "2025/W/2",
                SequenceNumber = 2,
                SupplierName = "Acme Corp",
                CargoType = "Wheat"
            });
            await setupContext.SaveChangesAsync();
        }

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var createRequest = new ContractCreateRequest(
            Title: "Mismatched contract",
            Description: null,
            RequestId: requestId,
            SupplierName: "Different Supplier",
            Quantity: null,
            CargoType: "Wheat",
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

        Assert.NotNull(message);
        Assert.Contains("supplier name", message!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateJson_ReturnsBadRequest_WhenLinkedRequestFieldsMismatch()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var requestId = Guid.NewGuid();
        var contractId = Guid.NewGuid();

        await using (var setupContext = new AppDbContext(options))
        {
            setupContext.Requests.Add(new Request
            {
                Id = requestId,
                PublicId = "2025/W/3",
                SequenceNumber = 3,
                SupplierName = "Acme Corp",
                CargoType = "Wheat"
            });

            setupContext.Contracts.Add(new Contract
            {
                Id = contractId,
                PublicId = "2025/W/10",
                SequenceNumber = 10,
                Title = "Existing contract",
                RequestId = requestId,
                SupplierName = "Acme Corp",
                CargoType = "Wheat"
            });

            await setupContext.SaveChangesAsync();
        }

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var updateRequest = new ContractUpdateRequest(
            Title: "Updated contract",
            Description: null,
            RequestId: requestId,
            SupplierName: "Acme Corp",
            Quantity: null,
            CargoType: "Oil",
            CountryOfOrigin: null,
            PricePerTon: null,
            PaymentMethod: null,
            ShippingMethod: null,
            ContractTerms: null,
            StartDate: null,
            EndDate: null,
            ReviewNotes: null
        );

        var result = await controller.UpdateJson(contractId, updateRequest);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var payload = badRequest.Value;
        var message = payload?.GetType().GetProperty("message")?.GetValue(payload) as string;

        Assert.NotNull(message);
        Assert.Contains("cargo type", message!, StringComparison.OrdinalIgnoreCase);
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
            setupContext.Requests.Add(new Request
            {
                Id = requestId,
                PublicId = "2025/W/0",
                SequenceNumber = 0
            });
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

    [Fact]
    public async Task GetAvailableLettersOfCredit_ReturnsEligibleLettersWithRemainingQuantity()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Primary Contract",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-001"
        };

        var otherContract = new Contract
        {
            Title = "Other Contract",
            SupplierName = "Supplier B",
            CargoType = "Wheat",
            SequenceNumber = 2,
            PublicId = "CON-002"
        };

        context.Contracts.AddRange(contract, otherContract);
        await context.SaveChangesAsync();

        var lcOne = new LetterOfCredit
        {
            Number = "LC-001",
            Status = "Active",
            Quantity = 100m,
            ContractId = contract.Id,
            CargoType = "Wheat",
            ExpiryDate = new DateTime(2030, 1, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        var lcTwo = new LetterOfCredit
        {
            Number = "LC-002",
            Status = "Active",
            Quantity = 80m,
            ContractId = contract.Id,
            CargoType = "Wheat",
            ExpiryDate = new DateTime(2029, 6, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        var lcDifferentSupplier = new LetterOfCredit
        {
            Number = "LC-OTHER",
            Status = "Active",
            Quantity = 120m,
            ContractId = otherContract.Id,
            CargoType = "Wheat",
            ExpiryDate = new DateTime(2030, 5, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        var lcDifferentProduct = new LetterOfCredit
        {
            Number = "LC-CORN",
            Status = "Active",
            Quantity = 75m,
            ContractId = contract.Id,
            CargoType = "Corn",
            ExpiryDate = new DateTime(2030, 3, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        var lcWithoutRemaining = new LetterOfCredit
        {
            Number = "LC-FULL",
            Status = "Active",
            Quantity = 60m,
            ContractId = contract.Id,
            CargoType = "Wheat",
            ExpiryDate = new DateTime(2030, 7, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        var lcIssued = new LetterOfCredit
        {
            Number = "LC-INACTIVE",
            Status = "Issued",
            Quantity = 90m,
            ContractId = contract.Id,
            CargoType = "Wheat",
            ExpiryDate = new DateTime(2030, 8, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        context.LettersOfCredit.AddRange(lcOne, lcTwo, lcDifferentSupplier, lcDifferentProduct, lcWithoutRemaining, lcIssued);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.AddRange(
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lcOne.Id,
                SupplierName = "Supplier A",
                Quantity = 25m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lcOne.Id,
                SupplierName = "Supplier A",
                Quantity = 15m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lcTwo.Id,
                SupplierName = "Supplier A",
                Quantity = 30m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lcDifferentSupplier.Id,
                SupplierName = "Supplier B",
                Quantity = 10m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lcWithoutRemaining.Id,
                SupplierName = "Supplier A",
                Quantity = 60m
            }
        );

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 10, search: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        Assert.Equal(3, payload.Total);
        Assert.Equal(1, payload.Page);
        Assert.Equal(10, payload.PageSize);
        Assert.Equal(3, payload.Items.Count);

        Assert.Equal(new[] { "LC-INACTIVE", "LC-001", "LC-002" }, payload.Items.Select(i => i.LcNumber).ToArray());

        var first = payload.Items[0];
        Assert.Equal("LC-INACTIVE", first.LcNumber);
        Assert.Equal(90m, first.TotalQuantity);
        Assert.Equal(0m, first.UsedQuantity);
        Assert.Equal(90m, first.RemainingQuantity);
        Assert.Equal("Supplier A", first.Supplier);
        Assert.Equal("Wheat", first.Product);

        var second = payload.Items[1];
        Assert.Equal("LC-001", second.LcNumber);
        Assert.Equal(100m, second.TotalQuantity);
        Assert.Equal(40m, second.UsedQuantity);
        Assert.Equal(60m, second.RemainingQuantity);

        var third = payload.Items[2];
        Assert.Equal("LC-002", third.LcNumber);
        Assert.Equal(80m, third.TotalQuantity);
        Assert.Equal(30m, third.UsedQuantity);
        Assert.Equal(50m, third.RemainingQuantity);
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_ExcludesIncorrectFlowOrLinkedContracts()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Target Contract",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-001"
        };

        var otherContract = new Contract
        {
            Title = "Other",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 2,
            PublicId = "CON-002"
        };

        context.Contracts.AddRange(contract, otherContract);
        await context.SaveChangesAsync();

        var eligible = new LetterOfCredit
        {
            Number = "LC-ELIGIBLE",
            Status = "Active",
            Quantity = 90m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER",
            ExpiryDate = new DateTime(2030, 1, 1)
        };

        var wrongFlow = new LetterOfCredit
        {
            Number = "LC-WRONG-FLOW",
            Status = "Active",
            Quantity = 90m,
            CargoType = "Wheat",
            Flow = "GASC_TO_UPF",
            ExpiryDate = new DateTime(2030, 1, 1)
        };

        var linkedElsewhere = new LetterOfCredit
        {
            Number = "LC-LINKED",
            Status = "Active",
            Quantity = 90m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER",
            ContractId = otherContract.Id,
            ExpiryDate = new DateTime(2030, 1, 1)
        };

        context.LettersOfCredit.AddRange(eligible, wrongFlow, linkedElsewhere);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = eligible.Id,
            SupplierName = "Supplier A",
            Quantity = 10m
        });

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 10, search: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        Assert.Single(payload.Items);
        Assert.Equal("LC-ELIGIBLE", payload.Items[0].LcNumber);
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_AcceptsAlternateFlowFormatting()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Target Contract",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-ALT"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var arrowFlow = new LetterOfCredit
        {
            Number = "LC-ARROW",
            Status = "Active",
            Quantity = 80m,
            CargoType = "Wheat",
            Flow = "UPF → Suppliers",
            ExpiryDate = new DateTime(2030, 2, 1)
        };

        var asciiArrowFlow = new LetterOfCredit
        {
            Number = "LC-ASCII",
            Status = "Active",
            Quantity = 70m,
            CargoType = "Wheat",
            Flow = "UPF->Supplier",
            ExpiryDate = new DateTime(2030, 3, 1)
        };

        var wrongFlow = new LetterOfCredit
        {
            Number = "LC-WRONG",
            Status = "Active",
            Quantity = 60m,
            CargoType = "Wheat",
            Flow = "GASC_TO_UPF",
            ExpiryDate = new DateTime(2030, 4, 1)
        };

        context.LettersOfCredit.AddRange(arrowFlow, asciiArrowFlow, wrongFlow);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.AddRange(
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = arrowFlow.Id,
                SupplierName = "Supplier A",
                Quantity = 10m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = asciiArrowFlow.Id,
                SupplierName = "Supplier A",
                Quantity = 5m
            });

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 10, search: null, all: true);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        Assert.Equal(2, payload.Items.Count);
        var numbers = payload.Items.Select(i => i.LcNumber).ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Contains("LC-ARROW", numbers);
        Assert.Contains("LC-ASCII", numbers);
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_TreatsEmptyContractIdAsUnlinked()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Primary Contract",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-003"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var letter = new LetterOfCredit
        {
            Number = "LC-EMPTY",
            Status = "Active",
            Quantity = 90m,
            ContractId = Guid.Empty,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER"
        };

        context.LettersOfCredit.Add(letter);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 10, search: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        var lc = Assert.Single(payload.Items);
        Assert.Equal("LC-EMPTY", lc.LcNumber);
        Assert.Equal(90m, lc.TotalQuantity);
        Assert.Equal(90m, lc.RemainingQuantity);
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_AppliesPaginationAndSearch()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Paged Contract",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-010"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var letters = new List<LetterOfCredit>();

        for (var i = 0; i < 12; i++)
        {
            letters.Add(new LetterOfCredit
            {
                Number = $"LC-{i:000}",
                Status = "Active",
                Quantity = 100m + i,
                ContractId = contract.Id,
                CargoType = "Wheat",
                ExpiryDate = new DateTime(2030, 1, 1).AddDays(i),
                Flow = "UPF_TO_SUPPLIER"
            });
        }

        context.LettersOfCredit.AddRange(letters);
        await context.SaveChangesAsync();

        foreach (var letter in letters)
        {
            context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = letter.Id,
                SupplierName = "Supplier A",
                Quantity = 10m
            });
        }

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var pagedResult = await controller.GetAvailableLettersOfCredit(contract.Id, page: 2, pageSize: 5, search: null);
        var pagedOk = Assert.IsType<OkObjectResult>(pagedResult.Result);
        var pagedPayload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(pagedOk.Value);

        Assert.Equal(12, pagedPayload.Total);
        Assert.Equal(2, pagedPayload.Page);
        Assert.Equal(5, pagedPayload.PageSize);
        Assert.Equal(5, pagedPayload.Items.Count);

        var allResult = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 5, search: null, all: true);
        var allOk = Assert.IsType<OkObjectResult>(allResult.Result);
        var allPayload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(allOk.Value);

        Assert.Equal(12, allPayload.Total);
        Assert.Equal(1, allPayload.Page);
        Assert.Equal(12, allPayload.PageSize);
        Assert.Equal(12, allPayload.Items.Count);

        var searchResult = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 5, search: "LC-007");
        var searchOk = Assert.IsType<OkObjectResult>(searchResult.Result);
        var searchPayload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(searchOk.Value);

        Assert.Equal(1, searchPayload.Total);
        Assert.Single(searchPayload.Items);
        Assert.Equal("LC-007", searchPayload.Items[0].LcNumber);
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_ProductMatchDisabledAllowsDifferentCargo()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Flexible Contract",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-500"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var matching = new LetterOfCredit
        {
            Number = "LC-WHEAT",
            Status = "Active",
            Quantity = 100m,
            ContractId = contract.Id,
            CargoType = "Wheat",
            ExpiryDate = new DateTime(2030, 4, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        var differentCargo = new LetterOfCredit
        {
            Number = "LC-CORN",
            Status = "Active",
            Quantity = 90m,
            ContractId = contract.Id,
            CargoType = "Corn",
            ExpiryDate = new DateTime(2030, 5, 1),
            Flow = "UPF_TO_SUPPLIER"
        };

        context.LettersOfCredit.AddRange(matching, differentCargo);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.AddRange(
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = matching.Id,
                SupplierName = "Supplier A",
                Quantity = 10m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = differentCargo.Id,
                SupplierName = "Supplier A",
                Quantity = 20m
            });

        await context.SaveChangesAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["LcMatching:RequireSupplierMatch"] = "true",
                ["LcMatching:RequireProductMatch"] = "false"
            })
            .Build();

        var controller = CreateController(context, configuration: configuration);

        var result = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 10, search: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        Assert.Equal(2, payload.Total);
        Assert.Equal(new[] { "LC-CORN", "LC-WHEAT" }, payload.Items.Select(i => i.LcNumber).ToArray());
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_UsesSupplierAllocationsWhenContractIsNull()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Unlinked Supplier Match",
            SupplierName = "Supplier Z",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-Z"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var letterOfCredit = new LetterOfCredit
        {
            Number = "LC-UNLINKED",
            Status = "Active",
            Quantity = 50m,
            Flow = "UPF_TO_SUPPLIER",
            CargoType = "Wheat"
        };

        context.LettersOfCredit.Add(letterOfCredit);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = letterOfCredit.Id,
            SupplierName = "Supplier Z",
            Quantity = 10m
        });

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAvailableLettersOfCredit(contract.Id, page: 1, pageSize: 10, search: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        Assert.Equal(1, payload.Total);
        Assert.Single(payload.Items);
        var summary = payload.Items[0];
        Assert.Equal("LC-UNLINKED", summary.LcNumber);
        Assert.Equal("Supplier Z", summary.Supplier);
        Assert.Equal(50m, summary.TotalQuantity);
        Assert.Equal(10m, summary.UsedQuantity);
        Assert.Equal(40m, summary.RemainingQuantity);
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_ReturnsResultsWhenContractCargoMissing()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Missing Cargo",
            SupplierName = "Supplier A",
            SequenceNumber = 1,
            PublicId = "CON-MISSING"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var letter = new LetterOfCredit
        {
            Number = "LC-NO-CARGO",
            Status = "Active",
            Quantity = 75m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER"
        };

        context.LettersOfCredit.Add(letter);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = letter.Id,
            SupplierName = "Supplier A",
            Quantity = 15m
        });

        await context.SaveChangesAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["LcMatching:RequireSupplierMatch"] = "true",
                ["LcMatching:RequireProductMatch"] = "true"
            })
            .Build();

        var controller = CreateController(context, configuration: configuration);

        var result = await controller.GetAvailableLettersOfCredit(
            contract.Id,
            page: 1,
            pageSize: 10,
            search: null,
            all: true,
            cargoType: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        Assert.Equal(1, payload.Total);
        Assert.Single(payload.Items);
        Assert.Equal("LC-NO-CARGO", payload.Items[0].LcNumber);
    }

    [Fact]
    public async Task GetAvailableLettersOfCredit_AllFilterIncludesAllCargoTypes()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "All Cargo",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-ALL"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var wheat = new LetterOfCredit
        {
            Number = "LC-WHEAT-ALL",
            Status = "Active",
            Quantity = 120m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER",
            ExpiryDate = new DateTime(2030, 1, 1)
        };

        var rice = new LetterOfCredit
        {
            Number = "LC-RICE-ALL",
            Status = "Active",
            Quantity = 110m,
            CargoType = "Rice",
            Flow = "UPF_TO_SUPPLIER",
            ExpiryDate = new DateTime(2030, 2, 1)
        };

        context.LettersOfCredit.AddRange(wheat, rice);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.AddRange(
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = wheat.Id,
                SupplierName = "Supplier A",
                Quantity = 20m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = rice.Id,
                SupplierName = "Supplier A",
                Quantity = 10m
            });

        await context.SaveChangesAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["LcMatching:RequireSupplierMatch"] = "true",
                ["LcMatching:RequireProductMatch"] = "true"
            })
            .Build();

        var controller = CreateController(context, configuration: configuration);

        var result = await controller.GetAvailableLettersOfCredit(
            contract.Id,
            page: 1,
            pageSize: 10,
            search: null,
            all: true,
            cargoType: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PaginatedResponse<AvailableLetterOfCreditSummary>>(ok.Value);

        Assert.Equal(2, payload.Total);
        Assert.Equal(2, payload.Items.Count);
        Assert.Equal(new[] { "LC-WHEAT-ALL", "LC-RICE-ALL" }, payload.Items.Select(i => i.LcNumber).ToArray());
    }

    [Fact]
    public async Task LinkLetterOfCredit_AttachesEligibleLetter()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Linkable",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-0100"
        };

        var letter = new LetterOfCredit
        {
            Number = "LC-LINK",
            Status = "Active",
            Quantity = 100m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER",
            ExpiryDate = new DateTime(2030, 1, 1)
        };

        context.Contracts.Add(contract);
        context.LettersOfCredit.Add(letter);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = letter.Id,
            SupplierName = "Supplier A",
            Quantity = 40m
        });

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.LinkLetterOfCredit(contract.Id, new ContractLetterOfCreditLinkRequest(letter.Id));

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(contract.Id, context.LettersOfCredit.Single().ContractId);
    }

    [Theory]
    [InlineData("Issued")]
    [InlineData("Amended")]
    public async Task LinkLetterOfCredit_AllowsOtherEligibleStatuses(string status)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Eligible Status",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-0102"
        };

        var letter = new LetterOfCredit
        {
            Number = $"LC-{status.ToUpperInvariant()}",
            Status = status,
            Quantity = 80m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER"
        };

        context.Contracts.Add(contract);
        context.LettersOfCredit.Add(letter);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.LinkLetterOfCredit(contract.Id, new ContractLetterOfCreditLinkRequest(letter.Id));

        var ok = Assert.IsType<OkObjectResult>(result);
        dynamic payload = ok.Value!;
        Assert.Equal("Letter of credit linked to contract successfully.", (string)payload.message);

        var updated = await context.LettersOfCredit.FindAsync(letter.Id);
        Assert.Equal(contract.Id, updated!.ContractId);
    }

    [Fact]
    public async Task LinkLetterOfCredit_AllowsLinkWhenContractIdIsEmptyGuid()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Empty Link",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-0101"
        };

        var letter = new LetterOfCredit
        {
            Number = "LC-EMPTY-LINK",
            Status = "Active",
            Quantity = 50m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER",
            ContractId = Guid.Empty
        };

        context.Contracts.Add(contract);
        context.LettersOfCredit.Add(letter);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.LinkLetterOfCredit(contract.Id, new ContractLetterOfCreditLinkRequest(letter.Id));

        var ok = Assert.IsType<OkObjectResult>(result);
        dynamic payload = ok.Value!;
        Assert.Equal("Letter of credit linked to contract successfully.", (string)payload.message);

        var updated = await context.LettersOfCredit.FindAsync(letter.Id);
        Assert.Equal(contract.Id, updated!.ContractId);
    }

    [Fact]
    public async Task LinkLetterOfCredit_ReturnsConflictWhenLinkedElsewhere()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);

        var contractA = new Contract { Title = "A", SequenceNumber = 1, PublicId = "CON-A" };
        var contractB = new Contract { Title = "B", SequenceNumber = 2, PublicId = "CON-B" };

        var letter = new LetterOfCredit
        {
            Number = "LC-CONFLICT",
            Status = "Active",
            Quantity = 100m,
            Flow = "UPF_TO_SUPPLIER",
            ContractId = contractA.Id
        };

        context.Contracts.AddRange(contractA, contractB);
        context.LettersOfCredit.Add(letter);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.LinkLetterOfCredit(contractB.Id, new ContractLetterOfCreditLinkRequest(letter.Id));

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        var payload = conflict.Value;
        var message = payload?.GetType().GetProperty("message")?.GetValue(payload) as string;
        Assert.Equal("This letter of credit is already linked to a different contract.", message);
    }

    private static ContractsController CreateController(
        AppDbContext context,
        IWebHostEnvironment? environment = null,
        IConfiguration? configuration = null)
    {
        var controller = new ContractsController(
            context,
            environment ?? new FakeWebHostEnvironment(),
            configuration ?? new ConfigurationBuilder().Build(),
            NullLogger<ContractsController>.Instance)
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
