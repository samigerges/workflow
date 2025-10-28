using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class ReportsControllerTests
{
    [Fact]
    public async Task GetContractJourney_ReturnsProjectedReport()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var contractId = Guid.NewGuid();
        var lcId = Guid.NewGuid();
        var vesselId = Guid.NewGuid();
        var shipmentId = Guid.NewGuid();

        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Contracts.Add(new Contract
            {
                Id = contractId,
                SequenceNumber = 5,
                PublicId = "CON-001",
                SupplierName = "Acme Grain",
                Quantity = 100,
                PricePerTon = 50,
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Status = "Active"
            });

            seedContext.LettersOfCredit.Add(new LetterOfCredit
            {
                Id = lcId,
                Number = "LC-123",
                IssuingBank = "GASC Bank",
                ContractId = contractId,
                IssueDate = new DateTime(2025, 1, 5, 0, 0, 0, DateTimeKind.Utc),
                Amount = 8000,
                Currency = "USD",
                CreatedAt = new DateTime(2025, 1, 2, 0, 0, 0, DateTimeKind.Utc)
            });

            seedContext.LetterOfCreditSupplierAllocations.Add(new LetterOfCreditSupplierAllocation
            {
                LetterOfCreditId = lcId,
                SupplierName = "Acme Grain",
                Amount = 3000
            });

            seedContext.Vessels.Add(new Vessel
            {
                Id = vesselId,
                Name = "MV Progress",
                ContractId = contractId,
                Quantity = 75m,
                PortOfDischarge = "Alexandria",
                Eta = new DateTime(2025, 1, 10, 0, 0, 0, DateTimeKind.Utc),
                Etd = new DateTime(2025, 1, 12, 0, 0, 0, DateTimeKind.Utc)
            });

            seedContext.Shipments.Add(new Shipment
            {
                Id = shipmentId,
                VesselId = vesselId,
                ContractId = contractId,
                Reference = "SHIP-1",
                CreatedAt = new DateTime(2025, 1, 8, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2025, 1, 8, 0, 0, 0, DateTimeKind.Utc)
            });

            seedContext.ShipmentDocuments.Add(new ShipmentDocument
            {
                ShipmentId = shipmentId,
                FileName = "packing-list.pdf",
                FilePath = "uploads/shipment-documents/packing-list.pdf"
            });

            seedContext.VesselDocuments.Add(new VesselDocument
            {
                VesselId = vesselId,
                FileName = "manifest.pdf",
                FilePath = "uploads/vessel-documents/manifest.pdf"
            });

            await seedContext.SaveChangesAsync();
        }

        await using var context = new AppDbContext(options);
        var controller = new ReportsController(context);

        var result = await controller.GetContractJourney(contractId.ToString());

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var report = Assert.IsType<ContractJourneyReportDto>(ok.Value);

        Assert.Equal(contractId, report.Contract.Id);
        Assert.Equal("CON-001", report.Contract.ContractNo);
        Assert.Equal("Acme Grain", report.Contract.SupplierName);
        Assert.Equal(5000m, report.Contract.Amount);
        Assert.Equal("USD", report.Contract.Currency);
        Assert.Equal("Active", report.Contract.Status);

        var lc = Assert.NotNull(report.LetterOfCredit);
        Assert.Equal(lcId, lc.LcId);
        Assert.Equal("LC-123", lc.LcNumber);
        Assert.Equal("GASC Bank", lc.BankName);
        Assert.Equal(new DateTime(2025, 1, 5, 0, 0, 0, DateTimeKind.Utc), lc.OpenedAt);
        Assert.Equal("USD", lc.Currency);
        Assert.Equal(3000m, lc.AllocatedAmount);
        Assert.Equal(5000m, lc.Balance);

        Assert.Single(report.Vessels);
        var vessel = report.Vessels.Single();
        Assert.Equal(vesselId, vessel.VesselId);
        Assert.Equal("MV Progress", vessel.VesselName);
        Assert.Equal("Alexandria", vessel.Port);
        Assert.Equal(75m, vessel.ContractualQuantity);
        Assert.Equal(1, vessel.ShipmentCount);
        Assert.Equal(1, vessel.SubmittedDocsCount);
        Assert.Equal(1, vessel.RequiredDocsCount);

        Assert.Equal(4, report.Durations.DaysContractToLc);
        Assert.Equal(5, report.Durations.DaysLcToFirstVessel);
        Assert.Equal(9, report.Durations.DaysContractToLastVessel);
    }

    [Fact]
    public async Task GetContractJourney_ReturnsNotFound_WhenContractMissing()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);
        var controller = new ReportsController(context);

        var result = await controller.GetContractJourney(Guid.NewGuid().ToString());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetContractJourney_SupportsSequenceNumberIdentifier()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var contractId = Guid.NewGuid();

        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Contracts.Add(new Contract
            {
                Id = contractId,
                SequenceNumber = 42,
                PublicId = "CON-042",
                SupplierName = "Sequence Supplier",
                CreatedAt = new DateTime(2025, 3, 15, 0, 0, 0, DateTimeKind.Utc),
                Status = "Active"
            });

            await seedContext.SaveChangesAsync();
        }

        await using var context = new AppDbContext(options);
        var controller = new ReportsController(context);

        var result = await controller.GetContractJourney("42");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var report = Assert.IsType<ContractJourneyReportDto>(ok.Value);

        Assert.Equal(contractId, report.Contract.Id);
        Assert.Equal("CON-042", report.Contract.ContractNo);
        Assert.Equal("Sequence Supplier", report.Contract.SupplierName);
    }
}
