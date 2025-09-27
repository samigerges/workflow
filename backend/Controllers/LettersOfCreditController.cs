using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/letters-of-credit")]
    [Authorize]
    public class LettersOfCreditController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        private const string DefaultFlow = "GASC_TO_UPF";

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "Draft", "Issued", "Active", "Amended", "Utilized", "Expired", "Cancelled", "Archived" };

        private static readonly Dictionary<string, string[]> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Draft"]     = new[] { "Issued", "Cancelled", "Archived" },
            ["Issued"]    = new[] { "Active", "Amended", "Utilized", "Expired", "Cancelled", "Archived" },
            ["Active"]    = new[] { "Amended", "Utilized", "Expired", "Cancelled", "Archived" },
            ["Amended"]   = new[] { "Issued", "Active", "Utilized", "Expired", "Cancelled", "Archived" },
            ["Utilized"]  = new[] { "Archived" },
            ["Expired"]   = new[] { "Archived" },
            ["Cancelled"] = new[] { "Archived" },
            ["Archived"]  = Array.Empty<string>()
        };

        private static readonly HashSet<string> AllowedFlows = new(StringComparer.OrdinalIgnoreCase)
        {
            DefaultFlow,
            "UPF_TO_SUPPLIER"
        };

        public LettersOfCreditController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private Guid? CurrentUserId()
        {
            var idStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private static DateTime? ToUtc(DateTime? value) =>
            value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;

        private static string? NormalizeString(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static bool CanAutoExpire(string status) =>
            !string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(status, "Archived", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(status, "Utilized", StringComparison.OrdinalIgnoreCase);

        private static bool TryMarkExpired(LetterOfCredit lc, DateTime referenceTimeUtc)
        {
            if (lc.ExpiryDate.HasValue
                && lc.ExpiryDate.Value < referenceTimeUtc
                && !string.Equals(lc.Status, "Expired", StringComparison.OrdinalIgnoreCase)
                && CanAutoExpire(lc.Status))
            {
                lc.Status = "Expired";
                lc.UpdatedAt = referenceTimeUtc;
                return true;
            }

            return false;
        }

        private async Task ApplyAutomaticExpiryAsync(DateTime referenceTimeUtc)
        {
            var candidates = await _db.LettersOfCredit
                .Where(l => l.ExpiryDate.HasValue
                    && l.ExpiryDate.Value < referenceTimeUtc
                    && l.Status != null
                    && l.Status.ToLower() != "expired"
                    && l.Status.ToLower() != "cancelled"
                    && l.Status.ToLower() != "archived"
                    && l.Status.ToLower() != "utilized")
                .ToListAsync();

            if (candidates.Count == 0) return;

            foreach (var lc in candidates)
            {
                lc.Status = "Expired";
                lc.UpdatedAt = referenceTimeUtc;
            }

            await _db.SaveChangesAsync();
        }

        private static bool IsTerminalUpfStatus(string? status)
        {
            if (status is null) return false;

            return string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase)
                || string.Equals(status, "Archived", StringComparison.OrdinalIgnoreCase)
                || string.Equals(status, "Expired", StringComparison.OrdinalIgnoreCase);
        }

        private static string DetermineUpfSupplierStatus(string currentStatus, int vesselCount, decimal allocatedQuantity, decimal targetQuantity)
        {
            if (vesselCount == 0)
            {
                return string.Equals(currentStatus, "Draft", StringComparison.OrdinalIgnoreCase)
                    ? "Draft"
                    : "Issued";
            }

            if (targetQuantity > 0m)
            {
                var tolerance = Math.Max(targetQuantity * 0.001m, 0.0001m);
                if (allocatedQuantity + tolerance >= targetQuantity)
                {
                    return "Utilized";
                }
            }
            else if (string.Equals(currentStatus, "Utilized", StringComparison.OrdinalIgnoreCase))
            {
                return "Utilized";
            }

            return "Active";
        }

        private async Task ApplyAutomaticUpfSupplierStatusesAsync(IReadOnlyList<LetterOfCredit> letters)
        {
            if (letters.Count == 0) return;

            var relevant = letters
                .Where(l => string.Equals(l.Flow, "UPF_TO_SUPPLIER", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (relevant.Count == 0) return;

            var ids = relevant.Select(l => l.Id).ToList();

            var allocations = await _db.VesselLettersOfCredit
                .Where(link => ids.Contains(link.LetterOfCreditId))
                .Select(link => new
                {
                    link.LetterOfCreditId,
                    Quantity = link.Vessel != null
                        ? (link.Vessel.ActualQuantity ?? link.Vessel.Quantity ?? 0m)
                        : 0m
                })
                .ToListAsync();

            var summary = allocations
                .GroupBy(x => x.LetterOfCreditId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        VesselCount = g.Count(),
                        AllocatedQuantity = g.Sum(x => x.Quantity)
                    });

            foreach (var lc in relevant)
            {
                if (IsTerminalUpfStatus(lc.Status))
                    continue;

                summary.TryGetValue(lc.Id, out var info);

                var vesselCount = info?.VesselCount ?? 0;
                var allocated = info?.AllocatedQuantity ?? 0m;
                var target = lc.Quantity ?? 0m;
                var current = string.IsNullOrWhiteSpace(lc.Status) ? "Draft" : lc.Status!;

                var next = DetermineUpfSupplierStatus(current, vesselCount, allocated, target);
                if (!string.Equals(next, current, StringComparison.OrdinalIgnoreCase))
                {
                    lc.Status = next;
                }
            }
        }

        private static bool TryNormalizeFlow(string? input, string fallback, out string normalized)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                normalized = fallback;
                return AllowedFlows.Contains(fallback);
            }

            var candidate = input.Trim()
                .Replace("-", "_", StringComparison.Ordinal)
                .Replace(" ", "_", StringComparison.Ordinal)
                .ToUpperInvariant();

            if (AllowedFlows.Contains(candidate))
            {
                normalized = candidate;
                return true;
            }

            normalized = fallback;
            return false;
        }

        private LetterOfCreditResponse ToResponse(LetterOfCredit lc)
        {
            string? url = null;
            if (!string.IsNullOrWhiteSpace(lc.FilePath))
            {
                var req = HttpContext.Request;
                url = $"{req.Scheme}://{req.Host}/{lc.FilePath.Replace("\\", "/")}";
            }

            var supplier = NormalizeString(lc.Contract?.SupplierName) ?? NormalizeString(lc.Beneficiary);

            return new LetterOfCreditResponse(
                lc.Id,
                lc.Number,
                lc.IssuingBank,
                lc.Amount,
                lc.Quantity,
                lc.PricePerUnit,
                lc.Currency,
                lc.IssueDate,
                lc.ShipmentPeriod,
                lc.ExpiryDate,
                lc.Applicant,
                lc.Beneficiary,
                supplier,
                lc.Status,
                lc.ContractId,
                lc.CreatedByUserId,
                lc.CreatedAt,
                lc.UpdatedAt,
                url,
                lc.FileName,
                lc.CargoType,
                lc.Flow
            );
        }

        private async Task<(string? relPath, string? originalName)> SaveLcFileAsync(IFormFile? file)
        {
            if (file is null || file.Length == 0) return (null, null);

            if (!FileUploadValidator.IsValid(file, out var error))
                throw new InvalidOperationException(error);

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "letters-of-credit");
            Directory.CreateDirectory(dir);

            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(dir, safeName);

            using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            var rel = Path.Combine("uploads", "letters-of-credit", safeName).Replace("\\", "/");
            return (rel, Path.GetFileName(file.FileName));
        }

        // -------- LIST & GET --------

        // GET /api/letters-of-credit
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LetterOfCreditResponse>>> GetAll([FromQuery] string? status, [FromQuery] Guid? contractId, [FromQuery] string? flow)
        {
            var q = _db.LettersOfCredit
                .Include(l => l.Contract)
                .AsQueryable();

            await ApplyAutomaticExpiryAsync(DateTime.UtcNow);

            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(l => l.Status == status);

            if (contractId is not null)
                q = q.Where(l => l.ContractId == contractId);

            if (!string.IsNullOrWhiteSpace(flow))
            {
                if (!TryNormalizeFlow(flow, DefaultFlow, out var normalizedFlow))
                    return BadRequest(new { message = $"Unsupported flow '{flow}'." });

                q = q.Where(l => l.Flow == normalizedFlow);
            }

            var items = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();
            await ApplyAutomaticUpfSupplierStatusesAsync(items);
            return items.Select(ToResponse).ToList();
        }

        // GET /api/letters-of-credit/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<LetterOfCreditResponse>> GetOne(Guid id)
        {
            var lc = await _db.LettersOfCredit
                .Include(l => l.Contract)
                .FirstOrDefaultAsync(l => l.Id == id);
            if (lc is null) return NotFound();

            if (TryMarkExpired(lc, DateTime.UtcNow))
            {
                await _db.SaveChangesAsync();
            }
            await ApplyAutomaticUpfSupplierStatusesAsync(new[] { lc });
            return ToResponse(lc);
        }

        // -------- CREATE --------

        // POST /api/letters-of-credit (JSON)
        [HttpPost]
        [Consumes("application/json")]
        public async Task<ActionResult<LetterOfCreditResponse>> CreateJson([FromBody] LetterOfCreditCreateRequest req)
        {
            if (!TryNormalizeFlow(req.Flow, DefaultFlow, out var normalizedFlow))
                return BadRequest(new { message = $"Unsupported flow '{req.Flow}'." });

            var lc = new LetterOfCredit
            {
                Number = req.Number.Trim(),
                IssuingBank = string.IsNullOrWhiteSpace(req.IssuingBank) ? null : req.IssuingBank.Trim(),
                Quantity = req.Quantity,
                PricePerUnit = req.PricePerUnit,
                Amount = req.Amount ?? (req.Quantity.HasValue && req.PricePerUnit.HasValue
                    ? req.Quantity.Value * req.PricePerUnit.Value
                    : null),
                Currency = string.IsNullOrWhiteSpace(req.Currency) ? null : req.Currency.Trim().ToUpperInvariant(),
                CargoType = string.IsNullOrWhiteSpace(req.CargoType) ? null : req.CargoType.Trim(),
                IssueDate = ToUtc(req.IssueDate),
                ShipmentPeriod = ToUtc(req.ShipmentPeriod),
                ExpiryDate = ToUtc(req.ExpiryDate),
                Applicant = string.IsNullOrWhiteSpace(req.Applicant) ? null : req.Applicant.Trim(),
                Beneficiary = string.IsNullOrWhiteSpace(req.Beneficiary) ? null : req.Beneficiary.Trim(),
                ContractId = req.ContractId,
                Status = "Issued",
                CreatedByUserId = CurrentUserId(),
                Flow = normalizedFlow
            };

            if (lc.ContractId is not null)
            {
                var exists = await _db.Contracts.AnyAsync(c => c.Id == lc.ContractId.Value);
                if (!exists) return BadRequest(new { message = "Linked contract not found." });
            }

            _db.LettersOfCredit.Add(lc);
            await _db.SaveChangesAsync();

            if (lc.ContractId is not null)
            {
                await _db.Entry(lc).Reference(l => l.Contract).LoadAsync();
            }

            return CreatedAtAction(nameof(GetOne), new { id = lc.Id }, ToResponse(lc));
        }

        // POST /api/letters-of-credit/upload (multipart/form-data; file field name: "lcFile")
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<LetterOfCreditResponse>> CreateForm(
            [FromForm] string number,
            [FromForm] string? issuingBank,
            [FromForm] decimal? amount,
            [FromForm] decimal? quantity,
            [FromForm] decimal? pricePerUnit,
            [FromForm] string? currency,
            [FromForm] string? cargoType,
            [FromForm] DateTime? issueDate,
            [FromForm] DateTime? shipmentPeriod,
            [FromForm] DateTime? expiryDate,
            [FromForm] string? applicant,
            [FromForm] string? beneficiary,
            [FromForm] Guid? contractId,
            [FromForm] string? flow,
            [FromForm(Name = "lcFile")] IFormFile? file)
        {
            if (!TryNormalizeFlow(flow, DefaultFlow, out var normalizedFlow))
                return BadRequest(new { message = $"Unsupported flow '{flow}'." });

            var lc = new LetterOfCredit
            {
                Number = number.Trim(),
                IssuingBank = string.IsNullOrWhiteSpace(issuingBank) ? null : issuingBank.Trim(),
                Quantity = quantity,
                PricePerUnit = pricePerUnit,
                Amount = amount ?? (quantity.HasValue && pricePerUnit.HasValue
                    ? quantity.Value * pricePerUnit.Value
                    : null),
                Currency = string.IsNullOrWhiteSpace(currency) ? null : currency.Trim().ToUpperInvariant(),
                CargoType = string.IsNullOrWhiteSpace(cargoType) ? null : cargoType.Trim(),
                IssueDate = ToUtc(issueDate),
                ShipmentPeriod = ToUtc(shipmentPeriod),
                ExpiryDate = ToUtc(expiryDate),
                Applicant = string.IsNullOrWhiteSpace(applicant) ? null : applicant.Trim(),
                Beneficiary = string.IsNullOrWhiteSpace(beneficiary) ? null : beneficiary.Trim(),
                ContractId = contractId,
                Status = "Issued",
                CreatedByUserId = CurrentUserId(),
                Flow = normalizedFlow
            };

            if (lc.ContractId is not null)
            {
                var exists = await _db.Contracts.AnyAsync(c => c.Id == lc.ContractId.Value);
                if (!exists) return BadRequest(new { message = "Linked contract not found." });
            }

            if (file is not null)
            {
                try
                {
                    var (rel, original) = await SaveLcFileAsync(file);
                    lc.FilePath = rel;
                    lc.FileName = original;
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            _db.LettersOfCredit.Add(lc);
            await _db.SaveChangesAsync();

            if (lc.ContractId is not null)
            {
                await _db.Entry(lc).Reference(l => l.Contract).LoadAsync();
            }

            return CreatedAtAction(nameof(GetOne), new { id = lc.Id }, ToResponse(lc));
        }

        // -------- UPDATE --------

        // PUT /api/letters-of-credit/{id} (JSON)
        [HttpPut("{id:guid}")]
        [Consumes("application/json")]
        public async Task<ActionResult<LetterOfCreditResponse>> UpdateJson(Guid id, [FromBody] LetterOfCreditUpdateRequest req)
        {
            var lc = await _db.LettersOfCredit.FindAsync(id);
            if (lc is null) return NotFound();

            var fallbackFlow = string.IsNullOrWhiteSpace(lc.Flow) ? DefaultFlow : lc.Flow;
            if (!TryNormalizeFlow(req.Flow, fallbackFlow, out var normalizedFlow))
                return BadRequest(new { message = $"Unsupported flow '{req.Flow}'." });

            lc.Number = req.Number.Trim();
            lc.IssuingBank = string.IsNullOrWhiteSpace(req.IssuingBank) ? null : req.IssuingBank.Trim();
            lc.Quantity = req.Quantity;
            lc.PricePerUnit = req.PricePerUnit;
            lc.Amount = req.Amount ?? (req.Quantity.HasValue && req.PricePerUnit.HasValue
                ? req.Quantity.Value * req.PricePerUnit.Value
                : lc.Amount);
            lc.Currency = string.IsNullOrWhiteSpace(req.Currency) ? null : req.Currency.Trim().ToUpperInvariant();
            lc.CargoType = string.IsNullOrWhiteSpace(req.CargoType) ? null : req.CargoType.Trim();
            lc.IssueDate = ToUtc(req.IssueDate);
            lc.ShipmentPeriod = ToUtc(req.ShipmentPeriod);
            lc.ExpiryDate = ToUtc(req.ExpiryDate);
            lc.Applicant = string.IsNullOrWhiteSpace(req.Applicant) ? null : req.Applicant.Trim();
            lc.Beneficiary = string.IsNullOrWhiteSpace(req.Beneficiary) ? null : req.Beneficiary.Trim();
            lc.ContractId = req.ContractId;
            lc.Flow = normalizedFlow;

            if (lc.ContractId is not null)
            {
                var exists = await _db.Contracts.AnyAsync(c => c.Id == lc.ContractId.Value);
                if (!exists) return BadRequest(new { message = "Linked contract not found." });
            }
            lc.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            if (lc.ContractId is not null)
            {
                await _db.Entry(lc).Reference(l => l.Contract).LoadAsync();
            }
            return ToResponse(lc);
        }

        // PUT /api/letters-of-credit/{id}/upload (multipart/form-data)
        [HttpPut("{id:guid}/upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<LetterOfCreditResponse>> UpdateForm(
            Guid id,
            [FromForm] string number,
            [FromForm] string? issuingBank,
            [FromForm] decimal? amount,
            [FromForm] decimal? quantity,
            [FromForm] decimal? pricePerUnit,
            [FromForm] string? currency,
            [FromForm] string? cargoType,
            [FromForm] DateTime? issueDate,
            [FromForm] DateTime? shipmentPeriod,
            [FromForm] DateTime? expiryDate,
            [FromForm] string? applicant,
            [FromForm] string? beneficiary,
            [FromForm] Guid? contractId,
            [FromForm] string? flow,
            [FromForm(Name = "lcFile")] IFormFile? file)
        {
            var lc = await _db.LettersOfCredit.FindAsync(id);
            if (lc is null) return NotFound();

            var fallbackFlow = string.IsNullOrWhiteSpace(lc.Flow) ? DefaultFlow : lc.Flow;
            if (!TryNormalizeFlow(flow, fallbackFlow, out var normalizedFlow))
                return BadRequest(new { message = $"Unsupported flow '{flow}'." });

            lc.Number = number.Trim();
            lc.IssuingBank = string.IsNullOrWhiteSpace(issuingBank) ? null : issuingBank.Trim();
            lc.Quantity = quantity;
            lc.PricePerUnit = pricePerUnit;
            lc.Amount = amount ?? (quantity.HasValue && pricePerUnit.HasValue
                ? quantity.Value * pricePerUnit.Value
                : lc.Amount);
            lc.Currency = string.IsNullOrWhiteSpace(currency) ? null : currency.Trim().ToUpperInvariant();
            lc.CargoType = string.IsNullOrWhiteSpace(cargoType) ? null : cargoType.Trim();
            lc.IssueDate = ToUtc(issueDate);
            lc.ShipmentPeriod = ToUtc(shipmentPeriod);
            lc.ExpiryDate = ToUtc(expiryDate);
            lc.Applicant = string.IsNullOrWhiteSpace(applicant) ? null : applicant.Trim();
            lc.Beneficiary = string.IsNullOrWhiteSpace(beneficiary) ? null : beneficiary.Trim();
            lc.ContractId = contractId;
            lc.Flow = normalizedFlow;

            if (lc.ContractId is not null)
            {
                var exists = await _db.Contracts.AnyAsync(c => c.Id == lc.ContractId.Value);
                if (!exists) return BadRequest(new { message = "Linked contract not found." });
            }

            if (file is not null)
            {
                try
                {
                    var (rel, original) = await SaveLcFileAsync(file);
                    lc.FilePath = rel;
                    lc.FileName = original;
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            lc.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            if (lc.ContractId is not null)
            {
                await _db.Entry(lc).Reference(l => l.Contract).LoadAsync();
            }

            return ToResponse(lc);
        }

        // -------- DELETE --------

        // DELETE /api/letters-of-credit/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var lc = await _db.LettersOfCredit.FindAsync(id);
            if (lc is null) return NotFound();

            _db.LettersOfCredit.Remove(lc);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // -------- STATUS --------

        // POST /api/letters-of-credit/{id}/status  { "status": "Issued" }
        [HttpPost("{id:guid}/status")]
        public async Task<ActionResult<LetterOfCreditResponse>> ChangeStatus(Guid id, [FromBody] LetterOfCreditStatusChangeRequest body)
        {
            if (string.IsNullOrWhiteSpace(body.Status) || !AllowedStatuses.Contains(body.Status))
                return BadRequest(new { message = "Invalid status." });

            var lc = await _db.LettersOfCredit.FindAsync(id);
            if (lc is null) return NotFound();

            var current = lc.Status;
            var nexts = AllowedTransitions.TryGetValue(current, out var allowed) ? allowed : Array.Empty<string>();
            if (!nexts.Contains(body.Status, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Transition from '{current}' to '{body.Status}' is not allowed." });

            lc.Status = body.Status;
            lc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ToResponse(lc);
        }

        // -------- PLACEHOLDER: Vessels for LC (to be implemented with Vessels) --------

        // GET /api/letters-of-credit/{id}/vessels
        [HttpGet("{id:guid}/vessels")]
        public async Task<ActionResult<IEnumerable<LetterOfCreditVesselAllocationResponse>>> GetVesselsForLc(Guid id)
        {
            var exists = await _db.LettersOfCredit.AnyAsync(x => x.Id == id);
            if (!exists) return NotFound();

            var vessels = await _db.VesselLettersOfCredit
                .Where(x => x.LetterOfCreditId == id)
                .Select(x => new LetterOfCreditVesselAllocationResponse(
                    x.VesselId,
                    x.LetterOfCreditId,
                    x.Vessel != null ? x.Vessel.Quantity : null))
                .ToListAsync();

            return vessels;
        }
    }
}
