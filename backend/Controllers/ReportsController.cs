using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize(Policy = "Reports.Read")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ReportsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("contract-journey/{contractIdentifier}")]
        public async Task<ActionResult<ContractJourneyReportDto>> GetContractJourney(string contractIdentifier)
        {
            if (string.IsNullOrWhiteSpace(contractIdentifier))
            {
                return NotFound();
            }

            var trimmedIdentifier = contractIdentifier.Trim();

            Guid? parsedContractId = null;
            int? parsedSequenceNumber = null;

            if (Guid.TryParse(trimmedIdentifier, out var guidId))
            {
                parsedContractId = guidId;
            }
            else if (int.TryParse(trimmedIdentifier, NumberStyles.Integer, CultureInfo.InvariantCulture, out var sequence))
            {
                parsedSequenceNumber = sequence;
            }

            var contractQuery = _db.Contracts
                .AsNoTracking()
                .Where(c =>
                    (parsedContractId.HasValue && c.Id == parsedContractId.Value) ||
                    (!parsedContractId.HasValue &&
                        (c.PublicId == trimmedIdentifier ||
                        (parsedSequenceNumber.HasValue && c.SequenceNumber == parsedSequenceNumber.Value))));

            var contractData = await contractQuery
                .Select(c => new
                {
                    c.Id,
                    c.PublicId,
                    c.SupplierName,
                    c.Quantity,
                    c.PricePerTon,
                    c.CreatedAt,
                    c.Status
                })
                .FirstOrDefaultAsync();

            if (contractData is null)
            {
                return NotFound();
            }

            var contractId = contractData.Id;
            var supplierName = contractData.SupplierName;

            var latestLetter = await _db.LettersOfCredit
                .AsNoTracking()
                .Where(l => l.ContractId == contractId)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new
                {
                    l.Id,
                    l.Number,
                    l.IssuingBank,
                    l.IssueDate,
                    l.Currency,
                    l.Amount
                })
                .FirstOrDefaultAsync();

            decimal supplierAllocated = 0m;
            decimal totalAllocated = 0m;

            if (latestLetter is not null)
            {
                supplierAllocated = await _db.LetterOfCreditSupplierAllocations
                    .AsNoTracking()
                    .Where(a => a.LetterOfCreditId == latestLetter.Id &&
                        (supplierName == null || a.SupplierName == supplierName))
                    .Select(a => a.Amount ?? 0m)
                    .DefaultIfEmpty(0m)
                    .SumAsync();

                totalAllocated = await _db.LetterOfCreditSupplierAllocations
                    .AsNoTracking()
                    .Where(a => a.LetterOfCreditId == latestLetter.Id)
                    .Select(a => a.Amount ?? 0m)
                    .DefaultIfEmpty(0m)
                    .SumAsync();
            }

            var contractCurrency = latestLetter?.Currency;
            var contractAmount = contractData.Quantity.HasValue && contractData.PricePerTon.HasValue
                ? contractData.Quantity.Value * contractData.PricePerTon.Value
                : (decimal?)null;

            var contract = new ContractJourneyContractDto(
                contractId,
                contractData.PublicId,
                contractData.SupplierName,
                contractAmount,
                contractCurrency,
                contractData.CreatedAt,
                contractData.Status
            );

            ContractJourneyLetterOfCreditDto? letter = null;
            DateTime? lcOpenedAt = null;

            if (latestLetter is not null)
            {
                lcOpenedAt = latestLetter.IssueDate;

                decimal? balance = latestLetter.Amount.HasValue
                    ? latestLetter.Amount.Value - totalAllocated
                    : (decimal?)null;

                letter = new ContractJourneyLetterOfCreditDto(
                    latestLetter.Id,
                    latestLetter.Number,
                    latestLetter.IssuingBank,
                    latestLetter.IssueDate,
                    latestLetter.Currency,
                    supplierAllocated,
                    balance
                );
            }

            var vesselEntities = await _db.Vessels
                .AsNoTracking()
                .Where(v => v.ContractId == contractId)
                .OrderBy(v => v.Eta ?? v.Etd ?? DateTime.MaxValue)
                .Select(v => new
                {
                    v.Id,
                    v.Name,
                    v.PortOfDischarge,
                    v.Eta,
                    v.Etd,
                    v.Quantity
                })
                .ToListAsync();

            var vesselIds = vesselEntities.Select(v => v.Id).ToList();

            List<(Guid ShipmentId, Guid VesselId)> shipments;

            if (vesselIds.Count == 0)
            {
                shipments = new List<(Guid ShipmentId, Guid VesselId)>();
            }
            else
            {
                shipments = (await _db.Shipments
                        .AsNoTracking()
                        .Where(s => vesselIds.Contains(s.VesselId))
                        .Select(s => new { s.Id, s.VesselId })
                        .ToListAsync())
                    .Select(x => (x.Id, x.VesselId))
                    .ToList();
            }

            var shipmentsByVessel = shipments
                .GroupBy(s => s.VesselId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.ShipmentId).ToList());

            var shipmentIds = shipments.Select(s => s.ShipmentId).ToList();

            var shipmentDocuments = shipmentIds.Count == 0
                ? new Dictionary<Guid, int>()
                : (await _db.ShipmentDocuments
                        .AsNoTracking()
                        .Where(d => shipmentIds.Contains(d.ShipmentId))
                        .GroupBy(d => d.ShipmentId)
                        .Select(g => new { ShipmentId = g.Key, Count = g.Count() })
                        .ToListAsync())
                    .ToDictionary(x => x.ShipmentId, x => x.Count);

            var vesselDocumentCounts = vesselIds.Count == 0
                ? new Dictionary<Guid, int>()
                : (await _db.VesselDocuments
                        .AsNoTracking()
                        .Where(d => vesselIds.Contains(d.VesselId))
                        .GroupBy(d => d.VesselId)
                        .Select(g => new { VesselId = g.Key, Count = g.Count() })
                        .ToListAsync())
                    .ToDictionary(x => x.VesselId, x => x.Count);

            var vessels = vesselEntities
                .Select(v =>
                {
                    shipmentsByVessel.TryGetValue(v.Id, out var vesselShipmentIds);
                    var shipmentCount = vesselShipmentIds?.Count ?? 0;
                    var submittedDocs = vesselShipmentIds?.Sum(shipmentId =>
                        shipmentDocuments.TryGetValue(shipmentId, out var docCount) ? docCount : 0) ?? 0;
                    var requiredDocs = vesselDocumentCounts.TryGetValue(v.Id, out var docCount) ? docCount : 0;

                    return new ContractJourneyVesselDto(
                        v.Id,
                        v.Name,
                        v.PortOfDischarge,
                        v.Eta,
                        v.Etd,
                        v.Quantity,
                        shipmentCount,
                        requiredDocs,
                        submittedDocs
                    );
                })
                .ToList();

            int? contractToLc = null;
            int? lcToFirstVessel = null;
            int? contractToLastVessel = null;

            if (lcOpenedAt is DateTime lcDate)
            {
                contractToLc = (int)(lcDate.Date - contract.CreatedAt.Date).TotalDays;
            }

            var firstVesselDate = vessels
                .Select(v => v.Eta ?? v.Etd)
                .FirstOrDefault(d => d.HasValue);

            if (lcOpenedAt is DateTime lcDateForFirst && firstVesselDate is DateTime fvDate)
            {
                lcToFirstVessel = (int)(fvDate.Date - lcDateForFirst.Date).TotalDays;
            }

            var lastVesselDate = vessels
                .Select(v => v.Eta ?? v.Etd)
                .LastOrDefault(d => d.HasValue);

            if (lastVesselDate is DateTime lvDate)
            {
                contractToLastVessel = (int)(lvDate.Date - contract.CreatedAt.Date).TotalDays;
            }

            var report = new ContractJourneyReportDto(
                contract,
                letter,
                vessels,
                Array.Empty<ContractJourneyMilestoneDto>(),
                new ContractJourneyDurationsDto(contractToLc, lcToFirstVessel, contractToLastVessel)
            );

            return Ok(report);
        }
    }
}
