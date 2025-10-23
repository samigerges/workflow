using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
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

            var data = await contractQuery
                .Select(c => new
                {
                    Contract = new ContractJourneyContractDto(
                        c.Id,
                        c.PublicId,
                        c.SupplierName,
                        c.Quantity.HasValue && c.PricePerTon.HasValue
                            ? c.Quantity.Value * c.PricePerTon.Value
                            : (decimal?)null,
                        _db.LettersOfCredit
                            .Where(l => l.ContractId == c.Id)
                            .Select(l => l.Currency)
                            .FirstOrDefault(),
                        c.CreatedAt,
                        c.Status
                    ),
                    Letter = _db.LettersOfCredit
                        .Where(l => l.ContractId == c.Id)
                        .OrderByDescending(l => l.CreatedAt)
                        .Select(l => new ContractJourneyLetterOfCreditDto(
                            l.Id,
                            l.Number,
                            l.IssuingBank,
                            l.IssueDate,
                            l.Currency,
                            _db.LetterOfCreditSupplierAllocations
                                .Where(a => a.LetterOfCreditId == l.Id &&
                                    (c.SupplierName == null || a.SupplierName == c.SupplierName))
                                .Select(a => a.Amount ?? 0m)
                                .DefaultIfEmpty(0m)
                                .Sum(),
                            l.Amount.HasValue
                                ? l.Amount - _db.LetterOfCreditSupplierAllocations
                                    .Where(a => a.LetterOfCreditId == l.Id)
                                    .Select(a => a.Amount ?? 0m)
                                    .DefaultIfEmpty(0m)
                                    .Sum()
                                : null
                        ))
                        .FirstOrDefault(),
                    Vessels = _db.Vessels
                        .Where(v => v.ContractId == c.Id)
                        .OrderBy(v => v.Eta ?? v.Etd ?? DateTime.MaxValue)
                        .Select(v => new ContractJourneyVesselDto(
                            v.Id,
                            v.Name,
                            v.PortOfDischarge,
                            v.Eta,
                            v.Etd,
                            _db.Shipments.Count(s => s.VesselId == v.Id),
                            _db.VesselDocuments.Count(d => d.VesselId == v.Id),
                            _db.Shipments
                                .Where(s => s.VesselId == v.Id)
                                .Join(
                                    _db.ShipmentDocuments,
                                    s => s.Id,
                                    d => d.ShipmentId,
                                    (s, d) => d.Id)
                                .Count()
                        ))
                        .ToList(),
                })
                .FirstOrDefaultAsync();

            if (data is null)
            {
                return NotFound();
            }

            var milestones = Array.Empty<ContractJourneyMilestoneDto>();

            int? contractToLc = null;
            int? lcToFirstVessel = null;
            int? contractToLastVessel = null;

            var contractStart = data.Contract.CreatedAt;
            if (data.Letter?.OpenedAt is DateTime lcOpenedAt)
            {
                contractToLc = (int)(lcOpenedAt.Date - contractStart.Date).TotalDays;
            }

            var orderedVessels = data.Vessels
                .OrderBy(v => v.Eta ?? v.Etd ?? DateTime.MaxValue)
                .ToList();

            DateTime? firstVesselDate = orderedVessels
                .Select(v => v.Eta ?? v.Etd)
                .FirstOrDefault(d => d.HasValue);

            if (data.Letter?.OpenedAt is DateTime lcDate && firstVesselDate is DateTime fvDate)
            {
                lcToFirstVessel = (int)(fvDate.Date - lcDate.Date).TotalDays;
            }

            DateTime? lastVesselDate = orderedVessels
                .Select(v => v.Eta ?? v.Etd)
                .LastOrDefault(d => d.HasValue);

            if (lastVesselDate is DateTime lvDate)
            {
                contractToLastVessel = (int)(lvDate.Date - contractStart.Date).TotalDays;
            }

            var report = new ContractJourneyReportDto(
                data.Contract,
                data.Letter,
                orderedVessels,
                milestones,
                new ContractJourneyDurationsDto(contractToLc, lcToFirstVessel, contractToLastVessel)
            );

            return Ok(report);
        }
    }
}
