using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
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

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "Draft", "Issued", "Amended", "Utilized", "Expired", "Cancelled", "Archived" };

        private static readonly Dictionary<string, string[]> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Draft"]     = new[] { "Issued", "Cancelled", "Archived" },
            ["Issued"]    = new[] { "Amended", "Utilized", "Expired", "Cancelled", "Archived" },
            ["Amended"]   = new[] { "Issued", "Utilized", "Expired", "Cancelled", "Archived" },
            ["Utilized"]  = new[] { "Archived" },
            ["Expired"]   = new[] { "Archived" },
            ["Cancelled"] = new[] { "Archived" },
            ["Archived"]  = Array.Empty<string>()
        };

        public LettersOfCreditController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private Guid? CurrentUserId()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private LetterOfCreditResponse ToResponse(LetterOfCredit lc)
        {
            string? url = null;
            if (!string.IsNullOrWhiteSpace(lc.FilePath))
            {
                var req = HttpContext.Request;
                url = $"{req.Scheme}://{req.Host}/{lc.FilePath.Replace("\\", "/")}";
            }

            return new LetterOfCreditResponse(
                lc.Id, lc.Number, lc.IssuingBank, lc.Amount, lc.Currency, lc.IssueDate, lc.ExpiryDate,
                lc.Applicant, lc.Beneficiary, lc.Status, lc.ContractId, lc.CreatedByUserId,
                lc.CreatedAt, lc.UpdatedAt, url, lc.FileName
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
        public async Task<ActionResult<IEnumerable<LetterOfCreditResponse>>> GetAll([FromQuery] string? status, [FromQuery] Guid? contractId)
        {
            var q = _db.LettersOfCredit.AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(l => l.Status == status);

            if (contractId is not null)
                q = q.Where(l => l.ContractId == contractId);

            var items = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();
            return items.Select(ToResponse).ToList();
        }

        // GET /api/letters-of-credit/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<LetterOfCreditResponse>> GetOne(Guid id)
        {
            var lc = await _db.LettersOfCredit.FindAsync(id);
            if (lc is null) return NotFound();
            return ToResponse(lc);
        }

        // -------- CREATE --------

        // POST /api/letters-of-credit (JSON)
        [HttpPost]
        [Consumes("application/json")]
        public async Task<ActionResult<LetterOfCreditResponse>> CreateJson([FromBody] LetterOfCreditCreateRequest req)
        {
            var lc = new LetterOfCredit
            {
                Number = req.Number.Trim(),
                IssuingBank = string.IsNullOrWhiteSpace(req.IssuingBank) ? null : req.IssuingBank.Trim(),
                Amount = req.Amount,
                Currency = string.IsNullOrWhiteSpace(req.Currency) ? null : req.Currency.Trim().ToUpperInvariant(),
                IssueDate = req.IssueDate,
                ExpiryDate = req.ExpiryDate,
                Applicant = string.IsNullOrWhiteSpace(req.Applicant) ? null : req.Applicant.Trim(),
                Beneficiary = string.IsNullOrWhiteSpace(req.Beneficiary) ? null : req.Beneficiary.Trim(),
                ContractId = req.ContractId,
                Status = "Draft",
                CreatedByUserId = CurrentUserId()
            };

            _db.LettersOfCredit.Add(lc);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOne), new { id = lc.Id }, ToResponse(lc));
        }

        // POST /api/letters-of-credit/upload (multipart/form-data; file field name: "lcFile")
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<LetterOfCreditResponse>> CreateForm(
            [FromForm] string number,
            [FromForm] string? issuingBank,
            [FromForm] decimal? amount,
            [FromForm] string? currency,
            [FromForm] DateTime? issueDate,
            [FromForm] DateTime? expiryDate,
            [FromForm] string? applicant,
            [FromForm] string? beneficiary,
            [FromForm] Guid? contractId,
            [FromForm(Name = "lcFile")] IFormFile? file)
        {
            var lc = new LetterOfCredit
            {
                Number = number.Trim(),
                IssuingBank = string.IsNullOrWhiteSpace(issuingBank) ? null : issuingBank.Trim(),
                Amount = amount,
                Currency = string.IsNullOrWhiteSpace(currency) ? null : currency.Trim().ToUpperInvariant(),
                IssueDate = issueDate,
                ExpiryDate = expiryDate,
                Applicant = string.IsNullOrWhiteSpace(applicant) ? null : applicant.Trim(),
                Beneficiary = string.IsNullOrWhiteSpace(beneficiary) ? null : beneficiary.Trim(),
                ContractId = contractId,
                Status = "Draft",
                CreatedByUserId = CurrentUserId()
            };

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

            lc.Number = req.Number.Trim();
            lc.IssuingBank = string.IsNullOrWhiteSpace(req.IssuingBank) ? null : req.IssuingBank.Trim();
            lc.Amount = req.Amount;
            lc.Currency = string.IsNullOrWhiteSpace(req.Currency) ? null : req.Currency.Trim().ToUpperInvariant();
            lc.IssueDate = req.IssueDate;
            lc.ExpiryDate = req.ExpiryDate;
            lc.Applicant = string.IsNullOrWhiteSpace(req.Applicant) ? null : req.Applicant.Trim();
            lc.Beneficiary = string.IsNullOrWhiteSpace(req.Beneficiary) ? null : req.Beneficiary.Trim();
            lc.ContractId = req.ContractId;
            lc.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
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
            [FromForm] string? currency,
            [FromForm] DateTime? issueDate,
            [FromForm] DateTime? expiryDate,
            [FromForm] string? applicant,
            [FromForm] string? beneficiary,
            [FromForm] Guid? contractId,
            [FromForm(Name = "lcFile")] IFormFile? file)
        {
            var lc = await _db.LettersOfCredit.FindAsync(id);
            if (lc is null) return NotFound();

            lc.Number = number.Trim();
            lc.IssuingBank = string.IsNullOrWhiteSpace(issuingBank) ? null : issuingBank.Trim();
            lc.Amount = amount;
            lc.Currency = string.IsNullOrWhiteSpace(currency) ? null : currency.Trim().ToUpperInvariant();
            lc.IssueDate = issueDate;
            lc.ExpiryDate = expiryDate;
            lc.Applicant = string.IsNullOrWhiteSpace(applicant) ? null : applicant.Trim();
            lc.Beneficiary = string.IsNullOrWhiteSpace(beneficiary) ? null : beneficiary.Trim();
            lc.ContractId = contractId;

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
        public async Task<ActionResult<IEnumerable<object>>> GetVesselsForLc(Guid id)
        {
            var exists = await _db.LettersOfCredit.AnyAsync(x => x.Id == id);
            if (!exists) return NotFound();
            var links = await _db.VesselLettersOfCredit
                .Include(x => x.Vessel)
                .Where(x => x.LetterOfCreditId == id)
                .ToListAsync();

            return links.Select(l => new
            {
                l.VesselId,
                l.Vessel!.Name,
                l.Vessel.Status
            }).ToList();
        }
    }
}
