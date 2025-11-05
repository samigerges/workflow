using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class VesselsControllerTests
{
    private class TestEnv : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Test";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = System.IO.Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Development";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = System.IO.Path.GetTempPath();
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task Nomination_flow_with_basic_fields_succeeds()
    {
        await using var db = CreateDb();
        var controller = new VesselsController(db, new TestEnv());

        var lc = new LetterOfCredit
        {
            Id = Guid.NewGuid(),
            Number = "LC-001",
        };
        db.LettersOfCredit.Add(lc);
        await db.SaveChangesAsync();

        var createReq = new VesselCreateRequest
        {
            Name = "تنليستنا",
            Status = "nominated",
            Eta = DateTime.Parse("2025-09-18T13:20:00"),
            Quantity = 20m,
        };

        var createResult = await controller.CreateJson(createReq);
        var vesselId = ((VesselResponse)((Microsoft.AspNetCore.Mvc.CreatedAtActionResult)createResult.Result!).Value!).Id;

        var created = await db.Vessels.FindAsync(vesselId);
        Assert.NotNull(created);
        Assert.Equal(20m, created!.Quantity);

        var linkResult = await controller.LinkLc(vesselId, new VesselLcLinkRequest(lc.Id));
        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(linkResult);

        var portResult = await controller.AddLoadingPort(
            vesselId,
            new LoadingPortCreateRequest("يبشس", "Russia", null, null));
        Assert.NotNull(portResult.Value);
    }

    [Fact]
    public async Task Available_letters_of_credit_filters_by_cargo_and_remaining_quantity()
    {
        await using var db = CreateDb();

        var contract = new Contract
        {
            Title = "Target Contract",
            SupplierName = "Supplier A",
            CargoType = "Wheat",
            SequenceNumber = 1,
            PublicId = "CON-001"
        };

        var vessel = new Vessel
        {
            Name = "MV Filter",
            CargoType = "Wheat",
            ContractId = contract.Id
        };

        var otherVessel = new Vessel
        {
            Name = "MV Existing",
            CargoType = "Wheat",
            ActualQuantity = 30m
        };

        var eligible = new LetterOfCredit
        {
            Number = "LC-ELIGIBLE",
            Status = "Active",
            Quantity = 100m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER",
            ContractId = contract.Id
        };

        var eligibleWithOtherVessel = new LetterOfCredit
        {
            Number = "LC-WITH-VESSEL",
            Status = "Issued",
            Quantity = 80m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER"
        };

        var wrongCargo = new LetterOfCredit
        {
            Number = "LC-CORN",
            Status = "Active",
            Quantity = 90m,
            CargoType = "Corn",
            Flow = "UPF_TO_SUPPLIER"
        };

        var noRemaining = new LetterOfCredit
        {
            Number = "LC-NONE",
            Status = "Active",
            Quantity = 60m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER"
        };

        var wrongFlow = new LetterOfCredit
        {
            Number = "LC-WRONG",
            Status = "Active",
            Quantity = 70m,
            CargoType = "Wheat",
            Flow = "GASC_TO_UPF"
        };

        var linkedElsewhere = new LetterOfCredit
        {
            Number = "LC-LINKED",
            Status = "Amended",
            Quantity = 70m,
            CargoType = "Wheat",
            Flow = "UPF_TO_SUPPLIER",
            ContractId = Guid.NewGuid()
        };

        db.Contracts.Add(contract);
        db.Vessels.AddRange(vessel, otherVessel);
        db.LettersOfCredit.AddRange(eligible, eligibleWithOtherVessel, wrongCargo, noRemaining, wrongFlow, linkedElsewhere);
        await db.SaveChangesAsync();

        db.LetterOfCreditSupplierAllocations.AddRange(
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = eligible.Id,
                SupplierName = "Supplier A",
                Quantity = 20m
            },
            new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = noRemaining.Id,
                SupplierName = "Supplier A",
                Quantity = 60m
            });

        db.VesselLettersOfCredit.Add(new VesselLetterOfCredit
        {
            VesselId = otherVessel.Id,
            LetterOfCreditId = eligibleWithOtherVessel.Id
        });

        await db.SaveChangesAsync();

        var controller = new VesselsController(db, new TestEnv());

        var result = await controller.GetAvailableLettersOfCredit(vessel.Id);

        var summaries = Assert.IsAssignableFrom<IEnumerable<AvailableLetterOfCreditSummary>>(result.Value).ToList();

        Assert.Equal(2, summaries.Count);
        Assert.Equal(new[] { eligible.Id, eligibleWithOtherVessel.Id }, summaries.Select(s => s.Id));

        var first = summaries.First(s => s.Id == eligible.Id);
        Assert.Equal(100m, first.TotalQuantity);
        Assert.Equal(20m, first.UsedQuantity);
        Assert.Equal(80m, first.RemainingQuantity);

        var second = summaries.First(s => s.Id == eligibleWithOtherVessel.Id);
        Assert.Equal(80m, second.TotalQuantity);
        Assert.Equal(30m, second.UsedQuantity);
        Assert.Equal(50m, second.RemainingQuantity);
    }

    [Fact]
    public async Task Available_letters_of_credit_returns_not_found_for_missing_vessel()
    {
        await using var db = CreateDb();
        var controller = new VesselsController(db, new TestEnv());

        var result = await controller.GetAvailableLettersOfCredit(Guid.NewGuid());

        Assert.IsType<Microsoft.AspNetCore.Mvc.NotFoundResult>(result.Result);
    }
}
