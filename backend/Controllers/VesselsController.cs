using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/vessels")]
    [Authorize]
    public class VesselsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "Planned", "Nominated", "Confirmed", "Loading", "In Transit", "Sailing", "Arrived", "Discharged", "Completed", "Closed", "Archived" };

        private static readonly Dictionary<string, string[]> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Planned"]    = new[] { "Nominated", "Confirmed", "Loading", "Archived" },
            ["Nominated"]  = new[] { "Confirmed", "Loading", "In Transit", "Sailing", "Archived" },
            ["Confirmed"]  = new[] { "In Transit", "Loading", "Archived" },
            ["Loading"]    = new[] { "Sailing", "In Transit", "Arrived", "Archived" },
            ["Sailing"]    = new[] { "Arrived", "In Transit", "Archived" },
            ["In Transit"] = new[] { "Arrived", "Discharged", "Archived" },
            ["Arrived"]    = new[] { "Discharged", "Completed", "Closed", "Archived" },
            ["Discharged"] = new[] { "Completed", "Closed", "Archived" },
            ["Completed"]  = new[] { "Closed", "Archived" },
            ["Closed"]     = new[] { "Archived" },
            ["Archived"]   = Array.Empty<string>()
        };

        public VesselsController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private Guid? CurrentUserId()
        {
            var idStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private string? MakeAbsolute(string? relPath)
        {
            if (string.IsNullOrWhiteSpace(relPath)) return null;
            var req = HttpContext.Request;
            return $"{req.Scheme}://{req.Host}/{relPath.Replace("\\", "/")}";
        }

        private static readonly TextInfo StatusTextInfo = CultureInfo.InvariantCulture.TextInfo;

        private static string? NormalizeString(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string? NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return null;
            var cleaned = status.Replace('_', ' ').Replace('-', ' ').Trim();
            if (cleaned.Length == 0) return null;
            return StatusTextInfo.ToTitleCase(cleaned.ToLowerInvariant());
        }

        private static string? NormalizeStageType(string? type)
        {
            if (string.IsNullOrWhiteSpace(type)) return null;
            var cleaned = type.Trim().Replace('-', '_').Replace(' ', '_').Trim('_');
            return string.IsNullOrWhiteSpace(cleaned) ? null : cleaned.ToLowerInvariant();
        }

        private static string? NormalizePath(string? path) =>
            string.IsNullOrWhiteSpace(path) ? null : path.Replace("\\", "/");

        private static DateTime? ToUtc(DateTime? value) =>
            value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;

        private void ApplyUpsert(Vessel vessel, VesselUpsertRequest req)
        {
            vessel.Name = req.Name.Trim();

            if (req.Status is not null)
            {
                var normalizedStatus = NormalizeStatus(req.Status);
                if (normalizedStatus is not null)
                {
                    vessel.Status = normalizedStatus;
                }
                else if (!string.IsNullOrWhiteSpace(req.Status))
                {
                    vessel.Status = req.Status.Trim();
                }
            }

            vessel.Eta = ToUtc(req.Eta);
            vessel.Etd = ToUtc(req.Etd);
            vessel.ContractId = req.ContractId;
            vessel.Quantity = req.Quantity;
            vessel.CargoType = NormalizeString(req.CargoType);
            vessel.CountryOfOrigin = NormalizeString(req.CountryOfOrigin);
            vessel.PortOfDischarge = NormalizeString(req.PortOfDischarge);

            if (req.TradeTerms is not null)
            {
                var normalizedTerms = NormalizeString(req.TradeTerms);
                vessel.TradeTerms = normalizedTerms is null ? null : normalizedTerms.ToUpperInvariant();
            }

            vessel.InsuranceCompany = NormalizeString(req.InsuranceCompany);
            vessel.InspectionCompany = NormalizeString(req.InspectionCompany);
            vessel.ShippingCompany = NormalizeString(req.ShippingCompany);
            vessel.InsuranceCost = req.InsuranceCost;
            vessel.InspectionCost = req.InspectionCost;
            vessel.ShippingCost = req.ShippingCost;

            vessel.ShippingInstructions = string.IsNullOrWhiteSpace(req.ShippingInstructions)
                ? null
                : req.ShippingInstructions.Trim();

            vessel.ArrivalDate = ToUtc(req.ArrivalDate);
            vessel.DischargeStartDate = ToUtc(req.DischargeStartDate);
            vessel.DischargeEndDate = ToUtc(req.DischargeEndDate);
            vessel.ActualQuantity = req.ActualQuantity;
            vessel.CustomsReleaseDate = ToUtc(req.CustomsReleaseDate);

            if (req.CustomsReleaseNumber is not null)
            {
                vessel.CustomsReleaseNumber = NormalizeString(req.CustomsReleaseNumber);
            }

            if (req.CustomsReleaseStatus is not null)
            {
                vessel.CustomsReleaseStatus = NormalizeString(req.CustomsReleaseStatus)?.ToLowerInvariant();
            }
        }

        private VesselResponse ToResponse(Vessel v)
        {
            var instructionsPath = NormalizePath(v.InstructionsPath);
            var customsReleasePath = NormalizePath(v.CustomsReleaseFilePath);

            return new VesselResponse(
                v.Id,
                v.Name,
                v.Name,
                v.Status,
                v.Eta,
                v.Etd,
                v.ContractId,
                v.Quantity,
                v.DischargedQuantity,
                v.CargoType,
                v.CountryOfOrigin,
                v.PortOfDischarge,
                v.TradeTerms,
                v.InsuranceCompany,
                v.InspectionCompany,
                v.ShippingCompany,
                v.InsuranceCost,
                v.InspectionCost,
                v.ShippingCost,
                v.ShippingInstructions,
                v.ArrivalDate,
                v.DischargeStartDate,
                v.DischargeEndDate,
                v.ActualQuantity,
                v.CustomsReleaseDate,
                v.CustomsReleaseNumber,
                v.CustomsReleaseStatus,
                MakeAbsolute(instructionsPath),
                instructionsPath,
                v.InstructionsFileName,
                MakeAbsolute(customsReleasePath),
                customsReleasePath,
                v.CustomsReleaseFileName,
                v.CreatedAt,
                v.UpdatedAt
            );
        }

        private async Task<string?> SaveInstructionsAsync(IFormFile? file)
        {
            if (file is null || file.Length == 0) return null;

            if (!FileUploadValidator.IsValid(file, out var error))
                throw new InvalidOperationException(error);

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "vessels");
            Directory.CreateDirectory(dir);
            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{Guid.NewGuid():N}{ext}";
            var full = Path.Combine(dir, safeName);
            using var stream = System.IO.File.Create(full);
            await file.CopyToAsync(stream);
            return Path.Combine("uploads", "vessels", safeName).Replace("\\", "/");
        }

        private async Task<string?> SaveCustomsReleaseAsync(IFormFile? file)
        {
            if (file is null || file.Length == 0) return null;

            if (!FileUploadValidator.IsValid(file, out var error))
                throw new InvalidOperationException(error);

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "vessels", "customs-release");
            Directory.CreateDirectory(dir);
            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{Guid.NewGuid():N}{ext}";
            var full = Path.Combine(dir, safeName);
            using var stream = System.IO.File.Create(full);
            await file.CopyToAsync(stream);

            return Path.Combine("uploads", "vessels", "customs-release", safeName).Replace("\\", "/");
        }

        private async Task<string?> SaveDischargeProofAsync(IFormFile? file)
        {
            if (file is null || file.Length == 0) return null;

            if (!FileUploadValidator.IsValid(file, out var error))
                throw new InvalidOperationException(error);

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "vessel-discharge-proofs");
            Directory.CreateDirectory(dir);
            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{Guid.NewGuid():N}{ext}";
            var full = Path.Combine(dir, safeName);
            using var stream = System.IO.File.Create(full);
            await file.CopyToAsync(stream);

            return Path.Combine("uploads", "vessel-discharge-proofs", safeName).Replace("\\", "/");
        }

        private async Task<VesselDocumentResponse> SaveVesselDocumentAsync(Guid vesselId, IFormFile file, string? type)
        {
            if (!FileUploadValidator.IsValid(file, out var error))
                throw new InvalidOperationException(error);

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "vessel-documents");
            Directory.CreateDirectory(dir);
            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{Guid.NewGuid():N}{ext}";
            var full = Path.Combine(dir, safeName);
            using var stream = System.IO.File.Create(full);
            await file.CopyToAsync(stream);

            var rel = Path.Combine("uploads", "vessel-documents", safeName).Replace("\\", "/");
            var normalizedType = NormalizeStageType(type);
            var doc = new VesselDocument
            {
                VesselId = vesselId,
                Type = normalizedType ?? (string.IsNullOrWhiteSpace(type) ? null : type.Trim()),
                FileName = Path.GetFileName(file.FileName),
                FilePath = rel
            };
            _db.VesselDocuments.Add(doc);
            await _db.SaveChangesAsync();

            return new VesselDocumentResponse(doc.Id, doc.Type, doc.FileName, MakeAbsolute(doc.FilePath), doc.UploadedAt);
        }

        // ---------- LIST & GET ----------

        [HttpGet]
        public async Task<ActionResult<IEnumerable<VesselResponse>>> GetAll([FromQuery] string? status)
        {
            var q = _db.Vessels.AsQueryable();
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(v => v.Status == status);
            var items = await q.OrderByDescending(v => v.CreatedAt).ToListAsync();
            return items.Select(ToResponse).ToList();
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<object>> GetOne(Guid id)
        {
            var v = await _db.Vessels
                .Include(x => x.LoadingPorts)
                .Include(x => x.Documents)
                .Include(x => x.StageEntries)
                .Include(x => x.LettersOfCredit)
                .ThenInclude(link => link.LetterOfCredit)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (v is null) return NotFound();

            var res = new
            {
                vessel = ToResponse(v),
                loadingPorts = v.LoadingPorts.Select(p => new
                {
                    p.Id, p.PortName, p.Country, p.Latitude, p.Longitude
                }),
                documents = v.Documents.Select(d => new VesselDocumentResponse(
                    d.Id, d.Type, d.FileName, MakeAbsolute(d.FilePath), d.UploadedAt
                )),
                stageEntries = v.StageEntries.Select(e => new VesselStageEntryResponse(
                    e.Id,
                    e.StageId,
                    e.NumberValue,
                    e.UpdatedAt
                )),
                lettersOfCredit = v.LettersOfCredit.Select(l => new
                {
                    l.LetterOfCreditId,
                    l.LetterOfCredit!.Number,
                    l.LetterOfCredit.Status
                })
            };

            return Ok(res);
        }

        [HttpGet("discharge-updates")]
        public async Task<ActionResult<IEnumerable<object>>> GetDischargeUpdates([FromQuery] Guid? vesselId)
        {
            var query = _db.VesselDischargeUpdates
                .Include(u => u.Vessel)
                .AsQueryable();

            if (vesselId.HasValue)
            {
                query = query.Where(u => u.VesselId == vesselId.Value);
            }

            var updates = await query
                .OrderByDescending(u => u.DischargeDate)
                .ThenByDescending(u => u.CreatedAt)
                .ToListAsync();

            var result = updates.Select(u =>
            {
                var proofPath = NormalizePath(u.ProofDocumentPath);
                var vessel = u.Vessel;
                return new
                {
                    u.Id,
                    u.VesselId,
                    u.DischargeDate,
                    u.QuantityDischarged,
                    u.Notes,
                    ProofDocumentUrl = MakeAbsolute(proofPath),
                    ProofDocumentFile = proofPath,
                    u.ProofDocumentFileName,
                    u.CreatedAt,
                    vessel = vessel is null ? null : new
                    {
                        vessel.Id,
                        vesselName = vessel.Name,
                        vessel.Status,
                        vessel.Quantity,
                        discharged_quantity = vessel.DischargedQuantity,
                        dischargedQuantity = vessel.DischargedQuantity
                    }
                };
            });

            return Ok(result);
        }

        [HttpPost("discharge-updates")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<object>> CreateDischargeUpdate(
            [FromForm] VesselDischargeUpdateRequest req,
            [FromForm(Name = "proofDocument")] IFormFile? proofDocument)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var vessel = await _db.Vessels.FirstOrDefaultAsync(v => v.Id == req.VesselId);
            if (vessel is null)
            {
                return NotFound(new { message = "Vessel not found." });
            }

            string? proofPath = null;
            string? proofName = null;
            if (proofDocument is not null)
            {
                try
                {
                    proofPath = await SaveDischargeProofAsync(proofDocument);
                    proofName = Path.GetFileName(proofDocument.FileName);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            var dischargeDate = req.Date.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(req.Date, DateTimeKind.Utc)
                : req.Date.ToUniversalTime();

            var update = new VesselDischargeUpdate
            {
                VesselId = vessel.Id,
                DischargeDate = dischargeDate,
                QuantityDischarged = req.QuantityDischarged,
                Notes = NormalizeString(req.Notes),
                ProofDocumentPath = proofPath,
                ProofDocumentFileName = proofName,
                CreatedByUserId = CurrentUserId(),
                CreatedAt = DateTime.UtcNow,
            };

            _db.VesselDischargeUpdates.Add(update);

            vessel.DischargedQuantity = Math.Round(vessel.DischargedQuantity + req.QuantityDischarged, 3);
            vessel.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var normalizedProof = NormalizePath(update.ProofDocumentPath);

            var response = new
            {
                success = true,
                message = "Discharge quantity updated successfully.",
                vesselId = vessel.Id,
                dischargedQuantity = vessel.DischargedQuantity,
                discharged_quantity = vessel.DischargedQuantity,
                cumulativeDischarged = vessel.DischargedQuantity,
                update = new
                {
                    update.Id,
                    update.VesselId,
                    update.DischargeDate,
                    update.QuantityDischarged,
                    update.Notes,
                    ProofDocumentUrl = MakeAbsolute(normalizedProof),
                    ProofDocumentFile = normalizedProof,
                    update.ProofDocumentFileName,
                    update.CreatedAt,
                },
                vessel = new
                {
                    vessel.Id,
                    vesselName = vessel.Name,
                    vessel.Status,
                    vessel.Quantity,
                    discharged_quantity = vessel.DischargedQuantity,
                    dischargedQuantity = vessel.DischargedQuantity,
                }
            };

            return Ok(response);
        }

        // ---------- CREATE ----------

        // JSON create
        [HttpPost]
        [Consumes("application/json")]
        public async Task<ActionResult<VesselResponse>> CreateJson([FromBody] VesselCreateRequest req)
        {
            var normalizedStatus = NormalizeStatus(req.Status);
            if (normalizedStatus is not null && !AllowedStatuses.Contains(normalizedStatus))
                return BadRequest(new { message = "Invalid status." });

            if (req.ContractId is Guid contractId && !await _db.Contracts.AnyAsync(c => c.Id == contractId))
                return BadRequest(new { message = "Invalid contract." });

            var vessel = new Vessel
            {
                CreatedByUserId = CurrentUserId(),
            };

            ApplyUpsert(vessel, req);

            if (string.IsNullOrWhiteSpace(vessel.Status))
                vessel.Status = "Planned";

            if (string.IsNullOrWhiteSpace(vessel.TradeTerms))
                vessel.TradeTerms = "FOB";

            vessel.CustomsReleaseStatus ??= "pending";

            _db.Vessels.Add(vessel);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetOne), new { id = vessel.Id }, ToResponse(vessel));
        }

        // Multipart create with optional instructions file (field: instructionsFile)
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<VesselResponse>> CreateForm(
            [FromForm] VesselCreateRequest req,
            [FromForm(Name = "instructionsFile")] IFormFile? instructionsFile,
            [FromForm(Name = "customsReleaseFile")] IFormFile? customsReleaseFile)
        {
            var normalizedStatus = NormalizeStatus(req.Status);
            if (normalizedStatus is not null && !AllowedStatuses.Contains(normalizedStatus))
                return BadRequest(new { message = "Invalid status." });

            if (req.ContractId is Guid contractId && !await _db.Contracts.AnyAsync(c => c.Id == contractId))
                return BadRequest(new { message = "Invalid contract." });

            var vessel = new Vessel
            {
                CreatedByUserId = CurrentUserId(),
            };

            ApplyUpsert(vessel, req);

            if (instructionsFile is not null)
            {
                try
                {
                    vessel.InstructionsPath = await SaveInstructionsAsync(instructionsFile);
                    vessel.InstructionsFileName = Path.GetFileName(instructionsFile.FileName);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            if (customsReleaseFile is not null)
            {
                try
                {
                    vessel.CustomsReleaseFilePath = await SaveCustomsReleaseAsync(customsReleaseFile);
                    vessel.CustomsReleaseFileName = Path.GetFileName(customsReleaseFile.FileName);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            if (string.IsNullOrWhiteSpace(vessel.Status))
                vessel.Status = "Planned";

            if (string.IsNullOrWhiteSpace(vessel.TradeTerms))
                vessel.TradeTerms = "FOB";

            vessel.CustomsReleaseStatus ??= "pending";

            _db.Vessels.Add(vessel);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetOne), new { id = vessel.Id }, ToResponse(vessel));
        }

        // ---------- UPDATE ----------

        // JSON update
        [HttpPut("{id:guid}")]
        [Consumes("application/json")]
        public async Task<ActionResult<VesselResponse>> UpdateJson(Guid id, [FromBody] VesselUpdateRequest req)
        {
            var normalizedStatus = NormalizeStatus(req.Status);
            if (normalizedStatus is not null && !AllowedStatuses.Contains(normalizedStatus))
                return BadRequest(new { message = "Invalid status." });

            if (req.ContractId is Guid contractId && !await _db.Contracts.AnyAsync(c => c.Id == contractId))
                return BadRequest(new { message = "Invalid contract." });

            var vessel = await _db.Vessels.FindAsync(id);
            if (vessel is null) return NotFound();

            ApplyUpsert(vessel, req);

            if (string.IsNullOrWhiteSpace(vessel.Status))
                vessel.Status = "Planned";

            if (string.IsNullOrWhiteSpace(vessel.TradeTerms))
                vessel.TradeTerms = "FOB";

            vessel.CustomsReleaseStatus ??= "pending";
            vessel.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return ToResponse(vessel);
        }

        // Multipart update with optional new instructions file
        [HttpPut("{id:guid}/upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<VesselResponse>> UpdateForm(
            Guid id,
            [FromForm] VesselUpdateRequest req,
            [FromForm(Name = "instructionsFile")] IFormFile? instructionsFile,
            [FromForm(Name = "customsReleaseFile")] IFormFile? customsReleaseFile)
        {
            var normalizedStatus = NormalizeStatus(req.Status);
            if (normalizedStatus is not null && !AllowedStatuses.Contains(normalizedStatus))
                return BadRequest(new { message = "Invalid status." });

            if (req.ContractId is Guid contractId && !await _db.Contracts.AnyAsync(c => c.Id == contractId))
                return BadRequest(new { message = "Invalid contract." });

            var vessel = await _db.Vessels.FindAsync(id);
            if (vessel is null) return NotFound();

            ApplyUpsert(vessel, req);

            if (instructionsFile is not null)
            {
                try
                {
                    vessel.InstructionsPath = await SaveInstructionsAsync(instructionsFile);
                    vessel.InstructionsFileName = Path.GetFileName(instructionsFile.FileName);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            if (customsReleaseFile is not null)
            {
                try
                {
                    vessel.CustomsReleaseFilePath = await SaveCustomsReleaseAsync(customsReleaseFile);
                    vessel.CustomsReleaseFileName = Path.GetFileName(customsReleaseFile.FileName);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            if (string.IsNullOrWhiteSpace(vessel.Status))
                vessel.Status = "Planned";

            if (string.IsNullOrWhiteSpace(vessel.TradeTerms))
                vessel.TradeTerms = "FOB";

            vessel.CustomsReleaseStatus ??= "pending";
            vessel.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return ToResponse(vessel);
        }

        // ---------- DELETE ----------
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var v = await _db.Vessels.FindAsync(id);
            if (v is null) return NotFound();
            _db.Vessels.Remove(v);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---------- LOADING PORTS ----------

        // POST /api/vessels/{id}/loading-ports
        [HttpPost("{id:guid}/loading-ports")]
        public async Task<ActionResult<object>> AddLoadingPort(Guid id, [FromBody] LoadingPortCreateRequest req)
        {
            var v = await _db.Vessels.FindAsync(id);
            if (v is null) return NotFound();

            var p = new LoadingPort
            {
                VesselId = id,
                PortName = req.PortName.Trim(),
                Country = string.IsNullOrWhiteSpace(req.Country) ? null : req.Country.Trim(),
                Latitude = req.Latitude,
                Longitude = req.Longitude
            };

            _db.LoadingPorts.Add(p);
            await _db.SaveChangesAsync();
            return new { p.Id, p.PortName, p.Country, p.Latitude, p.Longitude };
        }

        // DELETE /api/vessels/{id}/loading-ports/{portId}
        [HttpDelete("{id:guid}/loading-ports/{portId:guid}")]
        public async Task<IActionResult> RemoveLoadingPort(Guid id, Guid portId)
        {
            var p = await _db.LoadingPorts.FirstOrDefaultAsync(x => x.Id == portId && x.VesselId == id);
            if (p is null) return NotFound();
            _db.LoadingPorts.Remove(p);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---------- DOCUMENTS ----------

        // GET /api/vessels/{id}/documents
        [HttpGet("{id:guid}/documents")]
        public async Task<ActionResult<IEnumerable<VesselDocumentResponse>>> GetDocuments(Guid id)
        {
            var exists = await _db.Vessels.AnyAsync(x => x.Id == id);
            if (!exists) return NotFound();

            var docs = await _db.VesselDocuments.Where(d => d.VesselId == id).OrderByDescending(d => d.UploadedAt).ToListAsync();
            return docs.Select(d => new VesselDocumentResponse(d.Id, d.Type, d.FileName, MakeAbsolute(d.FilePath), d.UploadedAt)).ToList();
        }

        // POST /api/vessels/{id}/documents (multipart/form-data, field: file, optional field: type)
        [HttpPost("{id:guid}/documents")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<VesselDocumentResponse>> UploadDocument(Guid id, [FromForm] IFormFile file, [FromForm] string? type)
        {
            var vessel = await _db.Vessels.FindAsync(id);
            if (vessel is null) return NotFound();
            if (file is null || file.Length == 0) return BadRequest(new { message = "File required." });

            VesselDocumentResponse res;
            try
            {
                res = await SaveVesselDocumentAsync(id, file, type);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            var normalizedType = NormalizeStageType(type);
            if (string.Equals(normalizedType, "swift", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(vessel.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                vessel.Status = "Completed";
                vessel.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetDocuments), new { id }, res);
        }

        // DELETE /api/vessels/{id}/documents/{docId}
        [HttpDelete("{id:guid}/documents/{docId:guid}")]
        public async Task<IActionResult> DeleteDocument(Guid id, Guid docId)
        {
            var doc = await _db.VesselDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.VesselId == id);
            if (doc is null) return NotFound();
            _db.VesselDocuments.Remove(doc);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---------- STAGE ENTRIES ----------

        // GET /api/vessels/{id}/stage-entries
        [HttpGet("{id:guid}/stage-entries")]
        public async Task<ActionResult<IEnumerable<VesselStageEntryResponse>>> GetStageEntries(Guid id)
        {
            var exists = await _db.Vessels.AnyAsync(x => x.Id == id);
            if (!exists) return NotFound();

            var entries = await _db.VesselStageEntries
                .Where(e => e.VesselId == id)
                .OrderBy(e => e.StageId)
                .AsNoTracking()
                .ToListAsync();

            return entries
                .Select(e => new VesselStageEntryResponse(e.Id, e.StageId, e.NumberValue, e.UpdatedAt))
                .ToList();
        }

        // POST /api/vessels/{id}/stage-entries { stageId, value }
        [HttpPost("{id:guid}/stage-entries")]
        public async Task<ActionResult<VesselStageEntryResponse>> UpsertStageEntry(
            Guid id,
            [FromBody] VesselStageEntryRequest req)
        {
            var vessel = await _db.Vessels.FindAsync(id);
            if (vessel is null) return NotFound();

            var normalizedStageId = NormalizeStageType(req.StageId);
            if (string.IsNullOrWhiteSpace(normalizedStageId))
                return BadRequest(new { message = "Stage identifier is required." });

            var value = req.Value?.Trim();
            if (string.IsNullOrWhiteSpace(value))
                return BadRequest(new { message = "Stage value is required." });

            var entry = await _db.VesselStageEntries
                .FirstOrDefaultAsync(e => e.VesselId == id && e.StageId == normalizedStageId);

            var now = DateTime.UtcNow;
            if (entry is null)
            {
                entry = new VesselStageEntry
                {
                    VesselId = id,
                    StageId = normalizedStageId,
                    NumberValue = value,
                    UpdatedAt = now
                };

                _db.VesselStageEntries.Add(entry);
                await _db.SaveChangesAsync();

                var created = new VesselStageEntryResponse(entry.Id, entry.StageId, entry.NumberValue, entry.UpdatedAt);
                return CreatedAtAction(nameof(GetStageEntries), new { id }, created);
            }

            entry.NumberValue = value;
            entry.UpdatedAt = now;
            await _db.SaveChangesAsync();

            return new VesselStageEntryResponse(entry.Id, entry.StageId, entry.NumberValue, entry.UpdatedAt);
        }

        // ---------- LC LINKAGE ----------

        // GET /api/vessels/{id}/letters-of-credit
        [HttpGet("{id:guid}/letters-of-credit")]
        public async Task<ActionResult<IEnumerable<object>>> GetVesselLcs(Guid id)
        {
            var links = await _db.VesselLettersOfCredit
                .Include(x => x.LetterOfCredit)
                .Where(x => x.VesselId == id)
                .ToListAsync();

            return links.Select(l => new
            {
                l.LetterOfCreditId,
                l.LetterOfCredit!.Number,
                l.LetterOfCredit.Status
            }).ToList();
        }

        // POST /api/vessels/{id}/letters-of-credit { letterOfCreditId }
        [HttpPost("{id:guid}/letters-of-credit")]
        public async Task<IActionResult> LinkLc(Guid id, [FromBody] VesselLcLinkRequest body)
        {
            var vessel = await _db.Vessels.FindAsync(id);
            var lc = await _db.LettersOfCredit.FindAsync(body.LetterOfCreditId);
            if (vessel is null || lc is null) return NotFound();

            var exists = await _db.VesselLettersOfCredit.AnyAsync(x => x.VesselId == id && x.LetterOfCreditId == body.LetterOfCreditId);
            var shouldSave = false;
            if (!exists)
            {
                _db.VesselLettersOfCredit.Add(new VesselLetterOfCredit
                {
                    VesselId = id,
                    LetterOfCreditId = body.LetterOfCreditId
                });
                shouldSave = true;
            }

            var now = DateTime.UtcNow;
            var expired = false;
            if (lc.ExpiryDate.HasValue
                && lc.ExpiryDate.Value < now
                && !string.Equals(lc.Status, "Expired", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(lc.Status, "Cancelled", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(lc.Status, "Archived", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(lc.Status, "Utilized", StringComparison.OrdinalIgnoreCase))
            {
                lc.Status = "Expired";
                lc.UpdatedAt = now;
                expired = true;
                shouldSave = true;
            }

            if (!expired && !string.Equals(lc.Status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                lc.Status = "Active";
                lc.UpdatedAt = now;
                shouldSave = true;
            }

            if (shouldSave)
            {
                await _db.SaveChangesAsync();
            }
            return NoContent();
        }

        // DELETE /api/vessels/{id}/letters-of-credit/{lcId}
        [HttpDelete("{id:guid}/letters-of-credit/{lcId:guid}")]
        public async Task<IActionResult> UnlinkLc(Guid id, Guid lcId)
        {
            var link = await _db.VesselLettersOfCredit.FirstOrDefaultAsync(x => x.VesselId == id && x.LetterOfCreditId == lcId);
            if (link is null) return NotFound();
            _db.VesselLettersOfCredit.Remove(link);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---------- STATUS ----------

        // POST /api/vessels/{id}/status  { "status": "Nominated" }
        [HttpPost("{id:guid}/status")]
        public async Task<ActionResult<VesselResponse>> ChangeStatus(Guid id, [FromBody] dynamic body)
        {
            string status = (string?)body?.status ?? string.Empty;
            var normalizedStatus = NormalizeStatus(status);
            if (string.IsNullOrWhiteSpace(normalizedStatus) || !AllowedStatuses.Contains(normalizedStatus))
                return BadRequest(new { message = "Invalid status." });

            var v = await _db.Vessels.FindAsync(id);
            if (v is null) return NotFound();

            if (string.Equals(v.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                var finalStageTypes = await _db.VesselDocuments
                    .Where(d => d.VesselId == id && d.Type != null)
                    .Select(d => d.Type!)
                    .AsNoTracking()
                    .ToListAsync();

                if (finalStageTypes.Any(t => string.Equals(t, "swift", StringComparison.OrdinalIgnoreCase)))
                    return BadRequest(new { message = "Completed vessels cannot have their status modified." });
            }

            var current = v.Status;
            var nexts = AllowedTransitions.TryGetValue(current, out var allowed) ? allowed : Array.Empty<string>();
            if (!nexts.Contains(normalizedStatus, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Transition from '{current}' to '{normalizedStatus}' is not allowed." });

            v.Status = normalizedStatus;
            v.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return ToResponse(v);
        }
    }
}
