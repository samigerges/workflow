using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize(Policy = "Reports.Read")]
    public class ReportsController : ControllerBase
    {
        private const string SupplierFilterSeparator = "::";

        private readonly AppDbContext _db;

        public ReportsController(AppDbContext db)
        {
            _db = db;
        }

        private static string? NormalizeSupplierName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return null;
            }

            return name.Trim().ToLowerInvariant();
        }

        private static (Guid? ContractId, string? SupplierKey) ParseSupplierFilter(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return (null, null);
            }

            var parts = value.Split(SupplierFilterSeparator, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2)
            {
                return (null, null);
            }

            if (!Guid.TryParse(parts[0], out var contractId))
            {
                return (null, null);
            }

            var supplierKey = NormalizeSupplierName(parts[1]);
            return supplierKey is null ? (null, null) : (contractId, supplierKey);
        }

        private static DateTime? ParseDate(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed))
            {
                return parsed;
            }

            if (DateTime.TryParse(value, out parsed))
            {
                return parsed;
            }

            return null;
        }

        private static string EscapeCsvValue(string? value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            var needsEscaping = value.Contains('"') || value.Contains(',') || value.Contains('\n') || value.Contains('\r');
            if (!needsEscaping)
            {
                return value;
            }

            return $"\"{value.Replace("\"", "\"\"")}\"";
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

        [HttpPost("export")]
        public async Task<IActionResult> ExportReports([FromBody] ReportsExportRequest request, CancellationToken cancellationToken)
        {
            var (supplierContractId, supplierKey) = ParseSupplierFilter(request.SelectedSupplier);
            var selectedCountry = request.SelectedCountry;

            var fromDate = ParseDate(request.DateRange?.From)?.Date;
            var toDate = ParseDate(request.DateRange?.To)?.Date;
            if (toDate.HasValue)
            {
                toDate = toDate.Value.AddDays(1).AddTicks(-1);
            }

            var contractEntities = await _db.Contracts
                .AsNoTracking()
                .Where(c => !fromDate.HasValue || c.CreatedAt >= fromDate.Value)
                .Where(c => !toDate.HasValue || c.CreatedAt <= toDate.Value)
                .Select(c => new
                {
                    c.Id,
                    c.PublicId,
                    c.SupplierName,
                    c.Quantity,
                    c.CargoType,
                    c.CountryOfOrigin,
                    c.Status,
                    c.CreatedAt
                })
                .ToListAsync(cancellationToken);

            var vesselEntities = await _db.Vessels
                .AsNoTracking()
                .Where(v => !fromDate.HasValue || v.CreatedAt >= fromDate.Value)
                .Where(v => !toDate.HasValue || v.CreatedAt <= toDate.Value)
                .Select(v => new
                {
                    v.Id,
                    v.Name,
                    v.ContractId,
                    v.Quantity,
                    v.CargoType,
                    v.CountryOfOrigin,
                    v.PortOfDischarge,
                    v.Eta,
                    v.Etd,
                    v.Status,
                    v.DischargedQuantity
                })
                .ToListAsync(cancellationToken);

            var requestEntities = await _db.Requests
                .AsNoTracking()
                .Where(r => !fromDate.HasValue || r.CreatedAt >= fromDate.Value)
                .Where(r => !toDate.HasValue || r.CreatedAt <= toDate.Value)
                .Select(r => new
                {
                    r.Id,
                    r.PublicId,
                    r.SupplierName,
                    r.Quantity,
                    r.CargoType,
                    r.CountryOfOrigin,
                    r.Status,
                    r.CreatedAt
                })
                .ToListAsync(cancellationToken);

            var contracts = contractEntities
                .Select(c => new ContractExportModel(
                    c.Id,
                    c.PublicId,
                    c.SupplierName,
                    NormalizeSupplierName(c.SupplierName),
                    c.Quantity ?? 0m,
                    c.CargoType,
                    c.CountryOfOrigin,
                    c.Status,
                    c.CreatedAt
                ))
                .ToList();

            var vessels = vesselEntities
                .Select(v => new VesselExportModel(
                    v.Id,
                    v.Name,
                    v.ContractId,
                    v.Quantity ?? 0m,
                    v.CargoType,
                    v.CountryOfOrigin,
                    v.PortOfDischarge,
                    v.Eta,
                    v.Etd,
                    v.Status,
                    v.DischargedQuantity
                ))
                .ToList();

            var contractsById = contracts.ToDictionary(c => c.Id, c => c);

            var filteredVessels = vessels
                .Where(v =>
                {
                    var countryMatches = string.IsNullOrWhiteSpace(selectedCountry)
                        || string.Equals(v.CountryOfOrigin, selectedCountry, StringComparison.OrdinalIgnoreCase);

                    if (!countryMatches)
                    {
                        return false;
                    }

                    if (!supplierContractId.HasValue || supplierKey is null)
                    {
                        return true;
                    }

                    if (!v.ContractId.HasValue)
                    {
                        return false;
                    }

                    return contractsById.TryGetValue(v.ContractId.Value, out var contract)
                        && contract.Id == supplierContractId.Value
                        && contract.SupplierKey == supplierKey;
                })
                .ToList();

            var supplierFilteredContracts = contracts
                .Where(c =>
                    supplierContractId is null || supplierKey is null
                        || (c.Id == supplierContractId.Value && c.SupplierKey == supplierKey))
                .ToList();

            List<ContractExportModel> relevantContracts;
            if (string.IsNullOrWhiteSpace(selectedCountry))
            {
                relevantContracts = supplierFilteredContracts;
            }
            else
            {
                var contractIdsFromVessels = filteredVessels
                    .Where(v => v.ContractId.HasValue)
                    .Select(v => v.ContractId!.Value)
                    .Distinct()
                    .ToHashSet();

                relevantContracts = contractIdsFromVessels.Count == 0
                    ? new List<ContractExportModel>()
                    : supplierFilteredContracts
                        .Where(c => contractIdsFromVessels.Contains(c.Id))
                        .ToList();
            }

            var quantityMetrics = new QuantityMetricsExport(
                relevantContracts.Sum(c => c.Quantity),
                filteredVessels.Sum(v => v.DischargedQuantity ?? v.Quantity),
                Math.Max(0m, relevantContracts.Sum(c => c.Quantity) - filteredVessels.Sum(v => v.DischargedQuantity ?? v.Quantity))
            );

            var supplierMap = new Dictionary<string, SupplierExportModel>(StringComparer.OrdinalIgnoreCase);
            foreach (var contract in contracts)
            {
                var supplierKeyResolved = contract.SupplierKey ?? "unknown-supplier";
                var supplierName = string.IsNullOrWhiteSpace(contract.SupplierName)
                    ? "Unknown Supplier"
                    : contract.SupplierName.Trim();

                if (!supplierMap.TryGetValue(supplierKeyResolved, out var existing))
                {
                    existing = new SupplierExportModel(supplierName, 0, 0m, 0);
                    supplierMap[supplierKeyResolved] = existing;
                }

                supplierMap[supplierKeyResolved] = existing with
                {
                    Contracts = existing.Contracts + 1,
                    Quantity = existing.Quantity + contract.Quantity,
                    Vessels = existing.Vessels + vessels.Count(v => v.ContractId == contract.Id)
                };
            }

            SupplierExportModel? selectedSupplierData = null;
            if (supplierContractId.HasValue && supplierKey is not null)
            {
                var supplierContracts = contracts
                    .Where(c => c.Id == supplierContractId.Value && c.SupplierKey == supplierKey)
                    .ToList();

                if (supplierContracts.Count > 0)
                {
                    var supplierName = request.SelectedSupplierLabel
                        ?? supplierContracts.First().SupplierName
                        ?? "Unknown Supplier";

                    var vesselMatchesSupplier = vessels
                        .Where(v => v.ContractId.HasValue && supplierContracts.Any(c => c.Id == v.ContractId.Value))
                        .ToList();

                    var filteredSupplierVessels = filteredVessels
                        .Where(v => v.ContractId.HasValue && supplierContracts.Any(c => c.Id == v.ContractId.Value))
                        .ToList();

                    var vesselCount = string.IsNullOrWhiteSpace(selectedCountry)
                        ? vesselMatchesSupplier.Count
                        : filteredSupplierVessels.Count;

                    selectedSupplierData = new SupplierExportModel(
                        supplierName,
                        vesselCount,
                        supplierContracts.Sum(c => c.Quantity),
                        supplierContracts.Count
                    );
                }
            }

            var supplierCount = supplierContractId.HasValue ? 1 : relevantContracts
                .Select(c => c.SupplierKey)
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count();

            var totals = new DisplayTotalsExport(
                supplierContractId.HasValue ? 1 : supplierCount,
                filteredVessels.Count,
                relevantContracts.Count,
                quantityMetrics.TotalContracted,
                quantityMetrics.ArrivedQuantity,
                quantityMetrics.RemainingQuantity
            );

            var filename = BuildFilename(request, fromDate, toDate);

            return new FileCallbackResult("text/csv;charset=utf-8", async (stream, _) =>
            {
                await using var writer = new StreamWriter(stream, new UTF8Encoding(false), leaveOpen: true);
                await writer.WriteLineAsync("Summary");
                await writer.WriteLineAsync("Metric,Value");
                await writer.WriteLineAsync($"Total suppliers,{totals.TotalSuppliers}");
                await writer.WriteLineAsync($"Total vessels,{totals.TotalVessels}");
                await writer.WriteLineAsync($"Total contracts,{totals.TotalContracts}");
                await writer.WriteLineAsync($"Contracted quantity (tons),{totals.TotalContracted}");
                await writer.WriteLineAsync($"Arrived quantity (tons),{totals.ArrivedQuantity}");
                await writer.WriteLineAsync($"Remaining quantity (tons),{totals.RemainingQuantity}");

                if (selectedSupplierData is not null)
                {
                    await writer.WriteLineAsync("Selected supplier breakdown");
                    await writer.WriteLineAsync("Supplier,Vessels,Contracts,Quantity (tons)");
                    await writer.WriteLineAsync(string.Join(',', new[]
                    {
                        EscapeCsvValue(selectedSupplierData.Supplier),
                        selectedSupplierData.Vessels.ToString(),
                        selectedSupplierData.Contracts.ToString(),
                        selectedSupplierData.Quantity.ToString(CultureInfo.InvariantCulture)
                    }));
                }

                await writer.WriteLineAsync(string.Empty);
                await writer.WriteLineAsync("Applied filters");
                await writer.WriteLineAsync("Filter,Value");
                var supplierLabel = request.SelectedSupplierLabel ?? request.SelectedSupplier ?? "All";
                await writer.WriteLineAsync($"Supplier,{EscapeCsvValue(supplierLabel)}");
                await writer.WriteLineAsync($"Country,{EscapeCsvValue(selectedCountry ?? "All")}");
                await writer.WriteLineAsync($"Date range,{EscapeCsvValue($"{request.DateRange?.From ?? "Any"} -> {request.DateRange?.To ?? "Any"}")}");

                await writer.WriteLineAsync(string.Empty);
                await writer.WriteLineAsync("Suppliers");
                await writer.WriteLineAsync("Supplier,Vessels,Contracts,Total quantity (tons)");
                foreach (var supplier in supplierMap.Values)
                {
                    await writer.WriteLineAsync(string.Join(',', new[]
                    {
                        EscapeCsvValue(supplier.Supplier),
                        supplier.Vessels.ToString(),
                        supplier.Contracts.ToString(),
                        supplier.Quantity.ToString(CultureInfo.InvariantCulture)
                    }));
                }

                await writer.WriteLineAsync(string.Empty);
                await writer.WriteLineAsync("Vessel details");
                await writer.WriteLineAsync("Vessel name,Supplier,Contract,Cargo type,Country of origin,Quantity (tons),Discharged quantity (tons),Discharge port,ETA,Status");
                foreach (var vessel in filteredVessels)
                {
                    contractsById.TryGetValue(vessel.ContractId ?? Guid.Empty, out var vesselContract);

                    var supplierName = vesselContract?.SupplierName ?? "Unknown";
                    var contractIdentifier = vesselContract?.PublicId ?? vesselContract?.Id.ToString() ?? "Unassigned";
                    await writer.WriteLineAsync(string.Join(',', new[]
                    {
                        EscapeCsvValue(vessel.Name ?? string.Empty),
                        EscapeCsvValue(supplierName),
                        EscapeCsvValue(contractIdentifier),
                        EscapeCsvValue(vessel.CargoType ?? string.Empty),
                        EscapeCsvValue(vessel.CountryOfOrigin ?? string.Empty),
                        vessel.Quantity.ToString(CultureInfo.InvariantCulture),
                        (vessel.DischargedQuantity ?? vessel.Quantity).ToString(CultureInfo.InvariantCulture),
                        EscapeCsvValue(vessel.PortOfDischarge ?? string.Empty),
                        EscapeCsvValue(vessel.Eta?.ToString("yyyy-MM-dd") ?? vessel.Etd?.ToString("yyyy-MM-dd") ?? string.Empty),
                        EscapeCsvValue(vessel.Status ?? string.Empty)
                    }));
                }

                await writer.WriteLineAsync(string.Empty);
                await writer.WriteLineAsync("Contracts");
                await writer.WriteLineAsync("Contract,Supplier,Quantity (tons),Cargo type,Country of origin,Status,Created at");
                foreach (var contract in contracts)
                {
                    await writer.WriteLineAsync(string.Join(',', new[]
                    {
                        EscapeCsvValue(contract.PublicId ?? contract.Id.ToString()),
                        EscapeCsvValue(contract.SupplierName ?? string.Empty),
                        contract.Quantity.ToString(CultureInfo.InvariantCulture),
                        EscapeCsvValue(contract.CargoType ?? string.Empty),
                        EscapeCsvValue(contract.CountryOfOrigin ?? string.Empty),
                        EscapeCsvValue(contract.Status ?? string.Empty),
                        EscapeCsvValue(contract.CreatedAt.ToString("yyyy-MM-dd"))
                    }));
                }

                await writer.WriteLineAsync(string.Empty);
                await writer.WriteLineAsync("Requests");
                await writer.WriteLineAsync("Request,Supplier,Quantity (tons),Cargo type,Country of origin,Status,Created at");
                foreach (var req in requestEntities)
                {
                    await writer.WriteLineAsync(string.Join(',', new[]
                    {
                        EscapeCsvValue(req.PublicId ?? req.Id.ToString()),
                        EscapeCsvValue(req.SupplierName ?? string.Empty),
                        (req.Quantity ?? 0m).ToString(CultureInfo.InvariantCulture),
                        EscapeCsvValue(req.CargoType ?? string.Empty),
                        EscapeCsvValue(req.CountryOfOrigin ?? string.Empty),
                        EscapeCsvValue(req.Status ?? string.Empty),
                        EscapeCsvValue(req.CreatedAt?.ToString("yyyy-MM-dd") ?? string.Empty)
                    }));
                }

                await writer.FlushAsync();
            })
            {
                FileDownloadName = filename
            };
        }

        private static string BuildFilename(ReportsExportRequest request, DateTime? from, DateTime? to)
        {
            var builder = new StringBuilder("reports-export");

            if (!string.IsNullOrWhiteSpace(request.SelectedCountry))
            {
                builder.Append('-');
                builder.Append(request.SelectedCountry!.Trim().ToLowerInvariant().Replace(' ', '-'));
            }

            if (from.HasValue || to.HasValue)
            {
                builder.Append('-');
                builder.Append(from?.ToString("yyyyMMdd") ?? "any");
                builder.Append("-to-");
                builder.Append(to?.ToString("yyyyMMdd") ?? "any");
            }
            else
            {
                builder.Append('-');
                builder.Append(DateTime.UtcNow.ToString("yyyyMMdd"));
            }

            builder.Append(".csv");
            return builder.ToString();
        }

        private record ContractExportModel(
            Guid Id,
            string? PublicId,
            string? SupplierName,
            string? SupplierKey,
            decimal Quantity,
            string? CargoType,
            string? CountryOfOrigin,
            string? Status,
            DateTime CreatedAt
        );

        private record VesselExportModel(
            Guid Id,
            string? Name,
            Guid? ContractId,
            decimal Quantity,
            string? CargoType,
            string? CountryOfOrigin,
            string? PortOfDischarge,
            DateTime? Eta,
            DateTime? Etd,
            string? Status,
            decimal? DischargedQuantity
        );

        private record SupplierExportModel(string Supplier, int Vessels, decimal Quantity, int Contracts);

        private record QuantityMetricsExport(decimal TotalContracted, decimal ArrivedQuantity, decimal RemainingQuantity);

        private record DisplayTotalsExport(
            int TotalSuppliers,
            int TotalVessels,
            int TotalContracts,
            decimal TotalContracted,
            decimal ArrivedQuantity,
            decimal RemainingQuantity
        );
    }
}
