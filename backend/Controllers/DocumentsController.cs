using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/documents")]
    [Authorize]
    public class DocumentsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<DocumentsController> _logger;

        private static readonly long MaxFileSize = 10 * 1024 * 1024; // 10 MB
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"
        };

        private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/png",
            "image/jpeg"
        };

        public DocumentsController(AppDbContext db, IWebHostEnvironment env, ILogger<DocumentsController> logger)
        {
            _db = db;
            _env = env;
            _logger = logger;
        }

        private Guid? CurrentUserId()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private static string JoinTags(string[]? tags) =>
            (tags is null || tags.Length == 0)
                ? string.Empty
                : string.Join(',', tags.Select(t => t.Trim()).Where(t => !string.IsNullOrWhiteSpace(t)).Distinct(StringComparer.OrdinalIgnoreCase));

        private static string[] SplitTags(string? csv) =>
            string.IsNullOrWhiteSpace(csv)
                ? Array.Empty<string>()
                : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        private string? MakeAbsolute(string? rel)
        {
            if (string.IsNullOrWhiteSpace(rel)) return null;
            var req = HttpContext.Request;
            return $"{req.Scheme}://{req.Host}/{rel.Replace("\\", "/")}";
        }

        private DocumentResponse ToResponse(Document d) =>
            new DocumentResponse(
                d.Id, d.Title, d.Type, d.EntityType, d.EntityId,
                d.FileName,
                MakeAbsolute(d.FilePath),
                SplitTags(d.TagsCsv),
                d.UploadedByUserId,
                d.UploadedAt
            );

        private async Task<(string? relPath, string? original)> SaveFileAsync(IFormFile? file)
        {
            if (file is null || file.Length == 0) return (null, null);
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "global-documents");
            Directory.CreateDirectory(dir);

            var ext = Path.GetExtension(file.FileName);
            var safe = $"{Guid.NewGuid():N}{ext}";
            var full = Path.Combine(dir, safe);
            using var stream = System.IO.File.Create(full);
            await file.CopyToAsync(stream);

            var rel = Path.Combine("uploads", "global-documents", safe).Replace("\\", "/");
            return (rel, Path.GetFileName(file.FileName));
        }

        private string? ValidateFile(IFormFile file)
        {
            if (file.Length > MaxFileSize)
                return $"File exceeds maximum size of {MaxFileSize / 1024 / 1024} MB.";

            var ext = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(ext))
                return $"File type {ext} is not permitted.";

            if (!AllowedMimeTypes.Contains(file.ContentType))
                return $"MIME type {file.ContentType} is not permitted.";

            return null;
        }

        // ---------- LIST ----------
        // GET /api/documents?entityType=Vessel&entityId=...&q=...&tag=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DocumentResponse>>> List(
            [FromQuery] string? entityType,
            [FromQuery] Guid? entityId,
            [FromQuery] string? q,
            [FromQuery] string? tag)
        {
            var query = _db.Documents.AsQueryable();

            if (!string.IsNullOrWhiteSpace(entityType))
                query = query.Where(d => d.EntityType == entityType);

            if (entityId is not null)
                query = query.Where(d => d.EntityId == entityId);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(d =>
                    d.Title.Contains(term) ||
                    (d.Type != null && d.Type.Contains(term)) ||
                    (d.FileName != null && d.FileName.Contains(term)) ||
                    (d.TagsCsv != null && d.TagsCsv.Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(tag))
            {
                var needle = tag.Trim();
                query = query.Where(d => (d.TagsCsv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Contains(needle));
            }

            var docs = await query.OrderByDescending(d => d.UploadedAt).ToListAsync();
            return docs.Select(ToResponse).ToList();
        }

        // ---------- GET ONE ----------
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<DocumentResponse>> GetOne(Guid id)
        {
            var d = await _db.Documents.FindAsync(id);
            if (d is null) return NotFound();
            return ToResponse(d);
        }

        // ---------- CREATE (JSON) ----------
        [HttpPost]
        [Consumes("application/json")]
        public async Task<ActionResult<DocumentResponse>> CreateJson([FromBody] DocumentCreateRequest req)
        {
            var d = new Document
            {
                Title = req.Title.Trim(),
                Type = string.IsNullOrWhiteSpace(req.Type) ? null : req.Type.Trim(),
                EntityType = req.EntityType.Trim(),
                EntityId = req.EntityId,
                TagsCsv = JoinTags(req.Tags),
                UploadedByUserId = CurrentUserId()
            };

            _db.Documents.Add(d);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOne), new { id = d.Id }, ToResponse(d));
        }

        // ---------- CREATE (multipart) ----------
        // POST /api/documents/upload  (fields: title, entityType, entityId, type?, tags?; file field name: file)
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<DocumentResponse>> CreateForm(
            [FromForm] string title,
            [FromForm] string entityType,
            [FromForm] Guid entityId,
            [FromForm] string? type,
            [FromForm] string[]? tags,
            [FromForm(Name = "file")] IFormFile? file)
        {
            var d = new Document
            {
                Title = title.Trim(),
                Type = string.IsNullOrWhiteSpace(type) ? null : type.Trim(),
                EntityType = entityType.Trim(),
                EntityId = entityId,
                TagsCsv = JoinTags(tags),
                UploadedByUserId = CurrentUserId()
            };

            if (file is not null)
            {
                var error = ValidateFile(file);
                if (error is not null)
                {
                    _logger.LogWarning("Invalid file upload: {Error}", error);
                    return BadRequest(new { message = error });
                }

                var (rel, original) = await SaveFileAsync(file);
                d.FilePath = rel;
                d.FileName = original;
            }

            _db.Documents.Add(d);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOne), new { id = d.Id }, ToResponse(d));
        }

        // ---------- UPDATE (JSON) ----------
        [HttpPut("{id:guid}")]
        [Consumes("application/json")]
        public async Task<ActionResult<DocumentResponse>> UpdateJson(Guid id, [FromBody] DocumentUpdateRequest req)
        {
            var d = await _db.Documents.FindAsync(id);
            if (d is null) return NotFound();

            d.Title = req.Title.Trim();
            d.Type = string.IsNullOrWhiteSpace(req.Type) ? null : req.Type.Trim();
            d.TagsCsv = JoinTags(req.Tags);
            d.UploadedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return ToResponse(d);
        }

        // ---------- UPDATE FILE (multipart only) ----------
        // PUT /api/documents/{id}/upload (file field: file)
        [HttpPut("{id:guid}/upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<DocumentResponse>> UpdateFile(Guid id, [FromForm(Name = "file")] IFormFile file)
        {
            var d = await _db.Documents.FindAsync(id);
            if (d is null) return NotFound();
            if (file is null || file.Length == 0) return BadRequest(new { message = "File is required." });

            var error = ValidateFile(file);
            if (error is not null)
            {
                _logger.LogWarning("Invalid file upload: {Error}", error);
                return BadRequest(new { message = error });
            }

            var (rel, original) = await SaveFileAsync(file);
            d.FilePath = rel;
            d.FileName = original;
            d.UploadedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return ToResponse(d);
        }

        // ---------- DELETE ----------
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var d = await _db.Documents.FindAsync(id);
            if (d is null) return NotFound();

            _db.Documents.Remove(d);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
