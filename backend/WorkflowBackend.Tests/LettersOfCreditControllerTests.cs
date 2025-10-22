using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class LettersOfCreditControllerTests
{
    [Fact]
    public async Task CreateJson_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var issueDate = new DateTime(2024, 10, 5, 0, 0, 0, DateTimeKind.Unspecified);
        var expiryDate = new DateTime(2025, 2, 15);

        var request = new LetterOfCreditCreateRequest(
            Number: "LC-001",
            IssuingBank: "Test Bank",
            Amount: 10_000m,
            Quantity: 100m,
            PricePerUnit: 100m,
            Currency: "usd",
            IssueDate: issueDate,
            ShipmentPeriod: issueDate,
            ExpiryDate: expiryDate,
            Applicant: "Applicant",
            Beneficiary: "Beneficiary",
            ContractId: null,
            CargoType: "wheat");

        var result = await controller.CreateJson(request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<LetterOfCreditResponse>(created.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);
        Assert.Equal("GASC_TO_UPF", payload.Flow);

        var saved = await context.LettersOfCredit.SingleAsync();
        Assert.Equal(DateTimeKind.Utc, saved.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.ExpiryDate?.Kind);
        Assert.Equal("GASC_TO_UPF", saved.Flow);
    }

    [Fact]
    public async Task CreateJson_WithContract_PopulatesSupplierFromContract()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var contract = new Contract
        {
            Title = "Test Contract",
            PublicId = "CON-001",
            SupplierName = "Acme Suppliers"
        };

        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var issueDate = new DateTime(2024, 10, 5, 0, 0, 0, DateTimeKind.Unspecified);
        var expiryDate = new DateTime(2025, 2, 15);

        var request = new LetterOfCreditCreateRequest(
            Number: "LC-001",
            IssuingBank: "Test Bank",
            Amount: 10_000m,
            Quantity: 100m,
            PricePerUnit: 100m,
            Currency: "usd",
            IssueDate: issueDate,
            ShipmentPeriod: issueDate,
            ExpiryDate: expiryDate,
            Applicant: "Applicant",
            Beneficiary: "Beneficiary",
            ContractId: contract.Id,
            CargoType: "wheat");

        var result = await controller.CreateJson(request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<LetterOfCreditResponse>(created.Value);

        Assert.Equal("Acme Suppliers", payload.SupplierName);
        Assert.Equal("GASC_TO_UPF", payload.Flow);
    }

    [Fact]
    public async Task CreateForm_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var issueDate = new DateTime(2023, 3, 10);
        var expiryDate = new DateTime(2023, 9, 25);

        var result = await controller.CreateForm(
            number: "LC-002",
            issuingBank: "Another Bank",
            amount: 5_000m,
            quantity: 50m,
            pricePerUnit: 100m,
            currency: "eur",
            cargoType: "oil",
            issueDate: issueDate,
            shipmentPeriod: issueDate,
            expiryDate: expiryDate,
            applicant: null,
            beneficiary: null,
            contractId: null,
            flow: "GASC_TO_UPF",
            file: null);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<LetterOfCreditResponse>(created.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);
        Assert.Equal("GASC_TO_UPF", payload.Flow);

        var saved = await context.LettersOfCredit.SingleAsync();
        Assert.Equal(DateTimeKind.Utc, saved.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.ExpiryDate?.Kind);
        Assert.Equal("GASC_TO_UPF", saved.Flow);
    }

    [Fact]
    public async Task UpdateJson_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var lc = new LetterOfCredit { Number = "LC-Existing" };
        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var issueDate = new DateTime(2026, 1, 1);
        var expiryDate = new DateTime(2026, 12, 31);

        var request = new LetterOfCreditUpdateRequest(
            Number: "LC-Existing",
            IssuingBank: null,
            Amount: null,
            Quantity: 200m,
            PricePerUnit: 50m,
            Currency: "gbp",
            IssueDate: issueDate,
            ShipmentPeriod: issueDate,
            ExpiryDate: expiryDate,
            Applicant: null,
            Beneficiary: null,
            ContractId: null,
            CargoType: "rice",
            Flow: "UPF_TO_SUPPLIER");

        var result = await controller.UpdateJson(lc.Id, request);

        var payload = Assert.IsType<LetterOfCreditResponse>(result.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);

        Assert.Equal(DateTimeKind.Utc, lc.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, lc.ExpiryDate?.Kind);
        Assert.Equal("UPF_TO_SUPPLIER", lc.Flow);
        Assert.Equal("UPF_TO_SUPPLIER", payload.Flow);
    }

    [Fact]
    public async Task UpdateJson_WithContract_RefreshesSupplierName()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var contractA = new Contract
        {
            Title = "Contract A",
            PublicId = "CON-A",
            SupplierName = "Supplier A"
        };

        var contractB = new Contract
        {
            Title = "Contract B",
            PublicId = "CON-B",
            SupplierName = "Supplier B"
        };

        context.Contracts.AddRange(contractA, contractB);

        var lc = new LetterOfCredit
        {
            Number = "LC-Existing",
            ContractId = contractA.Id
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var issueDate = new DateTime(2026, 1, 1);
        var expiryDate = new DateTime(2026, 12, 31);

        var request = new LetterOfCreditUpdateRequest(
            Number: "LC-Existing",
            IssuingBank: null,
            Amount: null,
            Quantity: 200m,
            PricePerUnit: 50m,
            Currency: "gbp",
            IssueDate: issueDate,
            ShipmentPeriod: issueDate,
            ExpiryDate: expiryDate,
            Applicant: null,
            Beneficiary: null,
            ContractId: contractB.Id,
            CargoType: "rice",
            Flow: "UPF_TO_SUPPLIER");

        var result = await controller.UpdateJson(lc.Id, request);

        var payload = Assert.IsType<LetterOfCreditResponse>(result.Value);

        Assert.Equal("Supplier B", payload.SupplierName);
        Assert.Equal(contractB.Id, lc.ContractId);
        Assert.Equal("UPF_TO_SUPPLIER", payload.Flow);
        Assert.Equal("UPF_TO_SUPPLIER", lc.Flow);
    }

    [Fact]
    public async Task UpdateJson_WithAllocations_ReturnsAllocationsInResponse()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var lc = new LetterOfCredit
        {
            Number = "LC-Alloc-Resp",
            Quantity = 200m,
            Amount = 4_000m,
            Flow = "UPF_TO_SUPPLIER"
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = lc.Id,
            SupplierName = "Supplier A",
            Quantity = 40m,
            Amount = 800m
        });

        await context.SaveChangesAsync();

        var request = new LetterOfCreditUpdateRequest(
            Number: "LC-Alloc-Resp",
            IssuingBank: null,
            Amount: 4_000m,
            Quantity: 200m,
            PricePerUnit: null,
            Currency: null,
            IssueDate: null,
            ShipmentPeriod: null,
            ExpiryDate: null,
            Applicant: null,
            Beneficiary: null,
            ContractId: null,
            CargoType: null,
            Flow: "UPF_TO_SUPPLIER");

        var result = await controller.UpdateJson(lc.Id, request);

        var payload = Assert.IsType<LetterOfCreditResponse>(result.Value);
        var allocation = Assert.Single(payload.SupplierAllocations);
        Assert.Equal("Supplier A", allocation.SupplierName);
        Assert.Equal(40m, allocation.Quantity);
    }

    [Fact]
    public async Task UpdateJson_LoweringQuantityBelowAllocations_ReturnsBadRequest()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var lc = new LetterOfCredit
        {
            Number = "LC-Alloc-Limit",
            Quantity = 150m,
            Amount = 3_000m,
            Flow = "UPF_TO_SUPPLIER"
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = lc.Id,
            SupplierName = "Supplier A",
            Quantity = 120m,
            Amount = 2_400m
        });

        await context.SaveChangesAsync();

        var request = new LetterOfCreditUpdateRequest(
            Number: "LC-Alloc-Limit",
            IssuingBank: null,
            Amount: 3_000m,
            Quantity: 100m,
            PricePerUnit: null,
            Currency: null,
            IssueDate: null,
            ShipmentPeriod: null,
            ExpiryDate: null,
            Applicant: null,
            Beneficiary: null,
            ContractId: null,
            CargoType: null,
            Flow: "UPF_TO_SUPPLIER");

        var result = await controller.UpdateJson(lc.Id, request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateForm_LoweringAmountBelowAllocations_ReturnsBadRequest()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var lc = new LetterOfCredit
        {
            Number = "LC-Alloc-Form",
            Quantity = 100m,
            Amount = 5_000m,
            Flow = "UPF_TO_SUPPLIER"
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = lc.Id,
            SupplierName = "Supplier A",
            Quantity = 60m,
            Amount = 3_000m
        });

        await context.SaveChangesAsync();

        var result = await controller.UpdateForm(
            id: lc.Id,
            number: "LC-Alloc-Form",
            issuingBank: null,
            amount: 2_000m,
            quantity: 100m,
            pricePerUnit: null,
            currency: null,
            cargoType: null,
            issueDate: null,
            shipmentPeriod: null,
            expiryDate: null,
            applicant: null,
            beneficiary: null,
            contractId: null,
            flow: "UPF_TO_SUPPLIER",
            file: null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetAll_UpfFlowWithoutVessels_DefaultsToIssued()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit
        {
            Number = "LC-UPF-1",
            Flow = "UPF_TO_SUPPLIER",
            Status = "Active",
            Quantity = 100m
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAll(status: null, contractId: null, flow: "UPF_TO_SUPPLIER");

        var payload = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditResponse>>(result.Value);
        var single = Assert.Single(payload);
        Assert.Equal("Issued", single.Status);
    }

    [Fact]
    public async Task GetAll_UpfFlowWithPartialAllocation_SetsStatusToActive()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit
        {
            Number = "LC-UPF-2",
            Flow = "UPF_TO_SUPPLIER",
            Status = "Issued",
            Quantity = 100m
        };

        var vessel = new Vessel
        {
            Name = "MV Partial",
            Quantity = 40m
        };

        context.LettersOfCredit.Add(lc);
        context.Vessels.Add(vessel);
        await context.SaveChangesAsync();

        context.VesselLettersOfCredit.Add(new VesselLetterOfCredit
        {
            LetterOfCreditId = lc.Id,
            VesselId = vessel.Id
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAll(status: null, contractId: null, flow: "UPF_TO_SUPPLIER");

        var payload = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditResponse>>(result.Value);
        var single = Assert.Single(payload);
        Assert.Equal("Active", single.Status);
    }

    [Fact]
    public async Task GetAll_UpfFlowWithFullAllocation_SetsStatusToUtilized()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit
        {
            Number = "LC-UPF-3",
            Flow = "UPF_TO_SUPPLIER",
            Status = "Active",
            Quantity = 80m
        };

        var vessel = new Vessel
        {
            Name = "MV Complete",
            Quantity = 90m
        };

        context.LettersOfCredit.Add(lc);
        context.Vessels.Add(vessel);
        await context.SaveChangesAsync();

        context.VesselLettersOfCredit.Add(new VesselLetterOfCredit
        {
            LetterOfCreditId = lc.Id,
            VesselId = vessel.Id
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAll(status: null, contractId: null, flow: "UPF_TO_SUPPLIER");

        var payload = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditResponse>>(result.Value);
        var single = Assert.Single(payload);
        Assert.Equal("Utilized", single.Status);
    }

    [Fact]
    public async Task GetAll_UpfFlowWithSupplierAllocations_UsesAllocationTotals()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit
        {
            Number = "LC-UPF-SUP",
            Flow = "UPF_TO_SUPPLIER",
            Status = "Issued",
            Quantity = 100m,
            Amount = 1_000m
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = lc.Id,
            SupplierName = "Supplier A",
            Quantity = 100m,
            Amount = 1_000m
        });

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAll(status: null, contractId: null, flow: "UPF_TO_SUPPLIER");

        var payload = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditResponse>>(result.Value);
        var single = Assert.Single(payload);

        Assert.Equal("Utilized", single.Status);
        Assert.Single(single.SupplierAllocations);
        Assert.Equal("Supplier A", single.SupplierAllocations.Single().SupplierName);
    }

    [Fact]
    public async Task GetAll_UpfFlowKeepsTerminalStatuses()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit
        {
            Number = "LC-UPF-4",
            Flow = "UPF_TO_SUPPLIER",
            Status = "Cancelled",
            Quantity = 50m
        };

        var vessel = new Vessel
        {
            Name = "MV Cancelled",
            Quantity = 50m
        };

        context.LettersOfCredit.Add(lc);
        context.Vessels.Add(vessel);
        await context.SaveChangesAsync();

        context.VesselLettersOfCredit.Add(new VesselLetterOfCredit
        {
            LetterOfCreditId = lc.Id,
            VesselId = vessel.Id
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetAll(status: null, contractId: null, flow: "UPF_TO_SUPPLIER");

        var payload = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditResponse>>(result.Value);
        var single = Assert.Single(payload);
        Assert.Equal("Cancelled", single.Status);
    }

    [Fact]
    public async Task GetSupplierAllocations_ReturnsAllAllocations()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit { Number = "LC-Alloc" };
        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.AddRange(
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lc.Id,
                SupplierName = "Supplier A",
                Quantity = 40m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lc.Id,
                SupplierName = "Supplier B",
                Quantity = 10m
            });

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetSupplierAllocations(lc.Id);

        var payload = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditSupplierAllocationResponse>>(result.Value);
        Assert.Equal(2, payload.Count());
        Assert.Contains(payload, p => p.SupplierName == "Supplier A");
        Assert.Contains(payload, p => p.SupplierName == "Supplier B");
    }

    [Fact]
    public async Task CreateSupplierAllocation_ExceedingQuantity_ReturnsBadRequest()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit { Number = "LC-Alloc", Quantity = 50m };
        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        context.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = lc.Id,
            SupplierName = "Existing",
            Quantity = 40m
        });

        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var request = new LetterOfCreditSupplierAllocationRequest(
            SupplierId: null,
            SupplierName: "New Supplier",
            Quantity: 20m,
            Amount: null,
            Notes: null);

        var result = await controller.CreateSupplierAllocation(lc.Id, request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateSupplierAllocation_ReachingTargets_UpdatesStatus()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit
        {
            Number = "LC-Alloc",
            Flow = "UPF_TO_SUPPLIER",
            Status = "Issued",
            Quantity = 80m
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var request = new LetterOfCreditSupplierAllocationRequest(
            SupplierId: null,
            SupplierName: "Supplier",
            Quantity: 80m,
            Amount: null,
            Notes: null);

        var result = await controller.CreateSupplierAllocation(lc.Id, request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var allocation = Assert.IsType<LetterOfCreditSupplierAllocationResponse>(created.Value);

        Assert.Equal("Supplier", allocation.SupplierName);

        await context.Entry(lc).ReloadAsync();
        Assert.Equal("Utilized", lc.Status);
    }

    [Fact]
    public async Task DeleteSupplierAllocation_RecomputesStatus()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit
        {
            Number = "LC-Alloc",
            Flow = "UPF_TO_SUPPLIER",
            Status = "Active",
            Quantity = 100m
        };

        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var allocation = new LetterOfCreditSupplierAllocation
        {
            LetterOfCreditId = lc.Id,
            SupplierName = "Supplier",
            Quantity = 100m
        };

        context.LetterOfCreditSupplierAllocations.Add(allocation);
        await context.SaveChangesAsync();

        lc.Status = "Utilized";
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.DeleteSupplierAllocation(lc.Id, allocation.Id);

        Assert.IsType<NoContentResult>(result);

        await context.Entry(lc).ReloadAsync();
        Assert.Equal("Issued", lc.Status);
    }

    [Fact]
    public async Task UpdateForm_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var lc = new LetterOfCredit { Number = "LC-Form" };
        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var issueDate = new DateTime(2027, 4, 5);
        var expiryDate = new DateTime(2027, 8, 20);

        var result = await controller.UpdateForm(
            id: lc.Id,
            number: "LC-Form",
            issuingBank: null,
            amount: null,
            quantity: 80m,
            pricePerUnit: 125m,
            currency: "usd",
            cargoType: "sugar",
            issueDate: issueDate,
            shipmentPeriod: issueDate,
            expiryDate: expiryDate,
            applicant: null,
            beneficiary: null,
            contractId: null,
            flow: "UPF_TO_SUPPLIER",
            file: null);

        var payload = Assert.IsType<LetterOfCreditResponse>(result.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);

        Assert.Equal(DateTimeKind.Utc, lc.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, lc.ExpiryDate?.Kind);
        Assert.Equal("UPF_TO_SUPPLIER", payload.Flow);
        Assert.Equal("UPF_TO_SUPPLIER", lc.Flow);
    }

    [Fact]
    public async Task GetVesselsForLc_ReturnsLinkedVesselsWithQuantities()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit { Number = "LC-Link" };
        var vessel = new Vessel { Name = "MV Test", Quantity = 125m };

        context.LettersOfCredit.Add(lc);
        context.Vessels.Add(vessel);
        await context.SaveChangesAsync();

        context.VesselLettersOfCredit.Add(new VesselLetterOfCredit
        {
            VesselId = vessel.Id,
            LetterOfCreditId = lc.Id
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetVesselsForLc(lc.Id);

        var allocations = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditVesselAllocationResponse>>(result.Value);
        var allocation = Assert.Single(allocations);

        Assert.Equal(vessel.Id, allocation.VesselId);
        Assert.Equal(lc.Id, allocation.LetterOfCreditId);
        Assert.Equal(vessel.Quantity, allocation.Quantity);
    }

    private static DbContextOptions<AppDbContext> CreateInMemoryOptions() =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

    private static LettersOfCreditController CreateController(AppDbContext context, IWebHostEnvironment? environment = null)
    {
        var controller = new LettersOfCreditController(context, environment ?? new FakeWebHostEnvironment());

        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) },
            authenticationType: "Test");

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity)
        };

        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("example.test");

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public FakeWebHostEnvironment()
        {
            var root = Path.GetTempPath();
            WebRootPath = root;
            ContentRootPath = root;
        }

        public string ApplicationName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; }
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
