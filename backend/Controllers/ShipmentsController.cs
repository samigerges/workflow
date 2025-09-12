using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/shipments")]
    [Authorize]
    public class ShipmentsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "Planned", "Booked", "Loading", "InTransit", "Arrived", "Delivered", "Cancelled", "Archived" };

        private static readonly Dictionary<string, string[]> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Planned"]   = new[] { "Booked", "Cancelled", "Archived" },
            ["Booked"]    = new[] { "Loading", "Cancelled", "Archived" },
            ["Loading"]   = new[] { "InTransit", "Cancelled", "Archived" },
            ["InTransit"] = new[] { "Arrived", "Cancelled", "Archived" },
            ["Arrived"]   = new[] { "Delivered", "Archived" },
            ["Delivered"] = new[] { "Archived" },
            ["Cancelled"] = new[] { "Archived" },
            ["Archived"]  = Array.Empty<string>()
        };

        public ShipmentsController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private string? MakeAbsolute(string? relPath)
        {
            if (string.IsNullOrWhiteSpace(relPath)) return null;
            var req = HttpContext.Request;
            return $"{req.Scheme}://{req.Host}/{relPath.Replace("\\", "/")}";
        }

        private ShipmentResponse ToResponse(Shipment s) =>
            new ShipmentResponse(
                s.Id, s.Reference, s.Status, s.Quantity, s.Unit, s.LoadDate, s.Eta, s.Etd, s.DeliveryDate,
                s.VesselId, s.ContractId, s.LetterOfCreditId, s.CreatedAt, s.UpdatedAt
            );

        private async Task<ShipmentDocumentResponse> SaveShipmentDocumentAsync(Guid shipmentId, IFormFile file, string? type)
        {
            if (!FileUploadValidator.IsValid(file, out var error))
                throw new InvalidOperationException(error);

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "shipment-documents");
            Directory.CreateDirectory(dir);

            var ext = Path.GetExtension(file.FileName);
            var safe = $"{Guid.NewGuid():N}{ext}";
            var full = Path.Combine(dir, safe);
            using var stream = System.IO.File.Create(full);
            await file.CopyToAsync(stream);

            var rel = Path.Combine("uploads", "shipment-documents", safe).Replace("\\", "/");
            var doc = new ShipmentDocument
            {
                ShipmentId = shipmentId,
                Type = string.IsNullOrWhiteSpace(type) ? null : type.Trim(),
                FileName = Path.GetFileName(file.FileName),
                FilePath = rel
            };
            _db.ShipmentDocuments.Add(doc);
            await _db.SaveChangesAsync();

            return new ShipmentDocumentResponse(doc.Id, doc.Type, doc.FileName, MakeAbsolute(doc.FilePath), doc.UploadedAt);
        }

        // ---------- LIST & GET ----------

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ShipmentResponse>>> GetAll([FromQuery] string? status, [FromQuery] Guid? vesselId)
        {
            var q = _db.Shipments.AsQueryable();
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(s => s.Status == status);
            if (vesselId is not null) q = q.Where(s => s.VesselId == vesselId);
            var items = await q.OrderByDescending(s => s.CreatedAt).ToListAsync();
            return items.Select(ToResponse).ToList();
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<object>> GetOne(Guid id)
        {
            var s = await _db.Shipments
                .Include(x => x.Documents)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (s is null) return NotFound();

            return Ok(new
            {
                shipment = ToResponse(s),
                documents = s.Documents.Select(d => new ShipmentDocumentResponse(
                    d.Id, d.Type, d.FileName, MakeAbsolute(d.FilePath), d.UploadedAt
                ))
            });
        }

        // ---------- CREATE ----------

        // JSON
        [HttpPost]
        [Consumes("application/json")]
        public async Task<ActionResult<ShipmentResponse>> CreateJson([FromBody] ShipmentCreateRequest req)
        {
            if (!string.IsNullOrWhiteSpace(req.Status) && !AllowedStatuses.Contains(req.Status))
                return BadRequest(new { message = "Invalid status." });

            // basic foreign key validation
            var vesselExists = await _db.Vessels.AnyAsync(v => v.Id == req.VesselId);
            if (!vesselExists) return NotFound(new { message = "Vessel not found." });

            if (req.ContractId is not null && !await _db.Contracts.AnyAsync(c => c.Id == req.ContractId))
                return NotFound(new { message = "Contract not found." });

            if (req.LetterOfCreditId is not null && !await _db.LettersOfCredit.AnyAsync(l => l.Id == req.LetterOfCreditId))
                return NotFound(new { message = "Letter of Credit not found." });

            var s = new Shipment
            {
                Reference = req.Reference.Trim(),
                Status = string.IsNullOrWhiteSpace(req.Status) ? "Planned" : req.Status.Trim(),
                Quantity = req.Quantity,
                Unit = string.IsNullOrWhiteSpace(req.Unit) ? null : req.Unit.Trim().ToUpperInvariant(),
                LoadDate = req.LoadDate,
                Eta = req.Eta,
                Etd = req.Etd,
                DeliveryDate = req.DeliveryDate,
                VesselId = req.VesselId,
                ContractId = req.ContractId,
                LetterOfCreditId = req.LetterOfCreditId
            };

            _db.Shipments.Add(s);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOne), new { id = s.Id }, ToResponse(s));
        }

        // Multipart with optional first file (field: shipmentFile)
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<ShipmentResponse>> CreateForm(
            [FromForm] string reference,
            [FromForm] string? status,
            [FromForm] decimal? quantity,
            [FromForm] string? unit,
            [FromForm] DateTime? loadDate,
            [FromForm] DateTime? eta,
            [FromForm] DateTime? etd,
            [FromForm] DateTime? deliveryDate,
            [FromForm] Guid vesselId,
            [FromForm] Guid? contractId,
            [FromForm] Guid? letterOfCreditId,
            [FromForm(Name = "shipmentFile")] IFormFile? file)
        {
            if (!string.IsNullOrWhiteSpace(status) && !AllowedStatuses.Contains(status))
                return BadRequest(new { message = "Invalid status." });

            var vesselExists = await _db.Vessels.AnyAsync(v => v.Id == vesselId);
            if (!vesselExists) return NotFound(new { message = "Vessel not found." });

            if (contractId is not null && !await _db.Contracts.AnyAsync(c => c.Id == contractId))
                return NotFound(new { message = "Contract not found." });

            if (letterOfCreditId is not null && !await _db.LettersOfCredit.AnyAsync(l => l.Id == letterOfCreditId))
                return NotFound(new { message = "Letter of Credit not found." });

            var s = new Shipment
            {
                Reference = reference.Trim(),
                Status = string.IsNullOrWhiteSpace(status) ? "Planned" : status.Trim(),
                Quantity = quantity,
                Unit = string.IsNullOrWhiteSpace(unit) ? null : unit.Trim().ToUpperInvariant(),
                LoadDate = loadDate,
                Eta = eta,
                Etd = etd,
                DeliveryDate = deliveryDate,
                VesselId = vesselId,
                ContractId = contractId,
                LetterOfCreditId = letterOfCreditId
            };

            _db.Shipments.Add(s);
            await _db.SaveChangesAsync();

            if (file is not null)
            {
                try
                {
                    await SaveShipmentDocumentAsync(s.Id, file, "Initial");
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            return CreatedAtAction(nameof(GetOne), new { id = s.Id }, ToResponse(s));
        }

        // ---------- UPDATE ----------

        [HttpPut("{id:guid}")]
        [Consumes("application/json")]
        public async Task<ActionResult<ShipmentResponse>> UpdateJson(Guid id, [FromBody] ShipmentUpdateRequest req)
        {
            if (!string.IsNullOrWhiteSpace(req.Status) && !AllowedStatuses.Contains(req.Status))
                return BadRequest(new { message = "Invalid status." });

            var s = await _db.Shipments.FindAsync(id);
            if (s is null) return NotFound();

            var vesselExists = await _db.Vessels.AnyAsync(v => v.Id == req.VesselId);
            if (!vesselExists) return NotFound(new { message = "Vessel not found." });

            if (req.ContractId is not null && !await _db.Contracts.AnyAsync(c => c.Id == req.ContractId))
                return NotFound(new { message = "Contract not found." });

            if (req.LetterOfCreditId is not null && !await _db.LettersOfCredit.AnyAsync(l => l.Id == req.LetterOfCreditId))
                return NotFound(new { message = "Letter of Credit not found." });

            s.Reference = req.Reference.Trim();
            if (!string.IsNullOrWhiteSpace(req.Status)) s.Status = req.Status.Trim();
            s.Quantity = req.Quantity;
            s.Unit = string.IsNullOrWhiteSpace(req.Unit) ? null : req.Unit.Trim().ToUpperInvariant();
            s.LoadDate = req.LoadDate;
            s.Eta = req.Eta;
            s.Etd = req.Etd;
            s.DeliveryDate = req.DeliveryDate;
            s.VesselId = req.VesselId;
            s.ContractId = req.ContractId;
            s.LetterOfCreditId = req.LetterOfCreditId;

            s.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return ToResponse(s);
        }

        // ---------- DELETE ----------

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var s = await _db.Shipments.FindAsync(id);
            if (s is null) return NotFound();
            _db.Shipments.Remove(s);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---------- STATUS ----------

        [HttpPost("{id:guid}/status")]
        public async Task<ActionResult<ShipmentResponse>> ChangeStatus(Guid id, [FromBody] ShipmentStatusChangeRequest body)
        {
            if (string.IsNullOrWhiteSpace(body.Status) || !AllowedStatuses.Contains(body.Status))
                return BadRequest(new { message = "Invalid status." });

            var s = await _db.Shipments.FindAsync(id);
            if (s is null) return NotFound();

            var current = s.Status;
            var nexts = AllowedTransitions.TryGetValue(current, out var allowed) ? allowed : Array.Empty<string>();
            if (!nexts.Contains(body.Status, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Transition from '{current}' to '{body.Status}' is not allowed." });

            s.Status = body.Status;
            s.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ToResponse(s);
        }

        // ---------- DOCUMENTS ----------

        [HttpGet("{id:guid}/documents")]
        public async Task<ActionResult<IEnumerable<ShipmentDocumentResponse>>> GetDocuments(Guid id)
        {
            var exists = await _db.Shipments.AnyAsync(x => x.Id == id);
            if (!exists) return NotFound();

            var docs = await _db.ShipmentDocuments.Where(d => d.ShipmentId == id)
                .OrderByDescending(d => d.UploadedAt).ToListAsync();

            return docs.Select(d => new ShipmentDocumentResponse(
                d.Id, d.Type, d.FileName, MakeAbsolute(d.FilePath), d.UploadedAt
            )).ToList();
        }

        // POST /api/shipments/{id}/documents (multipart; fields: file, type?)
        [HttpPost("{id:guid}/documents")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<ShipmentDocumentResponse>> UploadDocument(Guid id, [FromForm] IFormFile file, [FromForm] string? type)
        {
            var exists = await _db.Shipments.AnyAsync(s => s.Id == id);
            if (!exists) return NotFound();
            if (file is null || file.Length == 0) return BadRequest(new { message = "File required." });

            ShipmentDocumentResponse res;
            try
            {
                res = await SaveShipmentDocumentAsync(id, file, type);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            return CreatedAtAction(nameof(GetDocuments), new { id }, res);
        }

        [HttpDelete("{id:guid}/documents/{docId:guid}")]
        public async Task<IActionResult> DeleteDocument(Guid id, Guid docId)
        {
            var doc = await _db.ShipmentDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.ShipmentId == id);
            if (doc is null) return NotFound();
            _db.ShipmentDocuments.Remove(doc);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
