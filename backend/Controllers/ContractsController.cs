using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/contracts")]
    [Authorize]
    public class ContractsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<ContractsController> _logger;

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "Draft", "Active", "Completed", "Cancelled", "Archived" };

        private static readonly Dictionary<string, string[]> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Draft"]     = new[] { "Active", "Cancelled", "Archived" },
            ["Active"]    = new[] { "Completed", "Cancelled", "Archived" },
            ["Completed"] = new[] { "Archived" },
            ["Cancelled"] = new[] { "Archived" },
            ["Archived"]  = Array.Empty<string>()
        };

        public ContractsController(AppDbContext db, IWebHostEnvironment env, ILogger<ContractsController> logger)
        {
            _db = db;
            _env = env;
            _logger = logger;
        }

        private static readonly Regex VarcharLengthRegex = new("character varying\\((\\d+)\\)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex SqliteLengthConstraintRegex = new(@"length\((?<column>""?[^"")]+""?)\)\s*<=\s*(?<limit>\d+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex SqliteConstraintNameRegex = new(@"CK_Contracts_(?<column>[A-Za-z0-9]+)_(?:Length|MaxLength)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private const int SqliteConstraintErrorCode = 19;
        private const int SqliteConstraintForeignKeyErrorCode = 787;
        private const int SqliteConstraintCheckErrorCode = 275;

        private static readonly IReadOnlyDictionary<string, (string Label, int? Limit)> ColumnLengthHints =
            new Dictionary<string, (string, int?)>(StringComparer.OrdinalIgnoreCase)
            {
                ["title"] = ("Title", 200),
                ["description"] = ("Description", Contract.NarrativeMaxLength),
                ["contract_terms"] = ("Contract terms", Contract.NarrativeMaxLength),
                ["review_notes"] = ("Review notes", Contract.ReviewNotesMaxLength),
                ["supplier_name"] = ("Supplier name", 200),
                ["cargo_type"] = ("Cargo type", 100),
                ["country_of_origin"] = ("Country of origin", 100),
                ["payment_method"] = ("Payment method", 100),
                ["shipping_method"] = ("Shipping method", 100),
                ["file_name"] = ("File name", 255),
                ["file_path"] = ("File path", 500)
            };

        private async Task<bool> RequestExistsAsync(Guid requestId) =>
            await _db.Requests.AnyAsync(r => r.Id == requestId);

        private ActionResult<ContractResponse> HandleContractSaveFailure(DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error while saving contract changes");

            if (ex.InnerException is PostgresException pg &&
                pg.SqlState is not null)
            {
                if (pg.SqlState == PostgresErrorCodes.ForeignKeyViolation)
                {
                    return ForeignKeyViolationResponse();
                }

                if (pg.SqlState == PostgresErrorCodes.StringDataRightTruncation)
                {
                    return CreateStringTooLongResponse(pg.ColumnName, null, pg.MessageText, pg.Detail);
                }
            }

            if (ex.InnerException is SqliteException sqlite)
            {
                if (IsSqliteForeignKeyViolation(sqlite))
                {
                    return ForeignKeyViolationResponse();
                }

                if (IsSqliteStringLengthViolation(sqlite, out var columnName, out var limit))
                {
                    return CreateStringTooLongResponse(columnName, limit, sqlite.Message);
                }
            }

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "An unexpected error occurred while saving the contract."
            });
        }

        private static int? TryParseLimit(string? message)
        {
            if (string.IsNullOrWhiteSpace(message)) return null;

            var match = VarcharLengthRegex.Match(message);
            if (match.Success && int.TryParse(match.Groups[1].Value, out var limit))
                return limit;

            match = SqliteLengthConstraintRegex.Match(message);
            if (match.Success && int.TryParse(match.Groups["limit"].Value, out limit))
                return limit;

            return null;
        }

        private ActionResult<ContractResponse> ForeignKeyViolationResponse() => BadRequest(new
        {
            message = "The related record referenced by this contract no longer exists. Please refresh and try again."
        });

        private ActionResult<ContractResponse> CreateStringTooLongResponse(string? rawColumnName, int? explicitLimit, params string?[] messages)
        {
            var columnKey = NormalizeColumnKey(rawColumnName);

            (string Label, int? Limit) fieldInfo;
            if (!string.IsNullOrEmpty(columnKey) && ColumnLengthHints.TryGetValue(columnKey, out fieldInfo))
            {
                // Field info found
            }
            else
            {
                var labelSource = string.IsNullOrWhiteSpace(rawColumnName)
                    ? "one of the fields"
                    : rawColumnName!.Replace("_", " ");
                var formattedLabel = string.IsNullOrWhiteSpace(rawColumnName)
                    ? labelSource
                    : CultureInfo.CurrentCulture.TextInfo.ToTitleCase(labelSource);
                fieldInfo = (formattedLabel, (int?)null);
            }

            var limit = explicitLimit ?? fieldInfo.Limit;
            if (!limit.HasValue)
            {
                foreach (var message in messages)
                {
                    limit = TryParseLimit(message);
                    if (limit.HasValue) break;
                }
            }

            var responseMessage = limit is int max
                ? $"The value for {fieldInfo.Label} exceeds the maximum length of {max} characters."
                : $"The value provided for {fieldInfo.Label} is too long. Please shorten it and try again.";

            return BadRequest(new { message = responseMessage });
        }

        private static bool IsSqliteForeignKeyViolation(SqliteException ex)
        {
            if (ex.SqliteExtendedErrorCode == SqliteConstraintForeignKeyErrorCode)
                return true;

            return ex.SqliteErrorCode == SqliteConstraintErrorCode &&
                   ex.Message?.IndexOf("FOREIGN KEY constraint failed", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static bool IsSqliteStringLengthViolation(SqliteException ex, out string? columnName, out int? limit)
        {
            columnName = null;
            limit = null;

            var isConstraint = ex.SqliteExtendedErrorCode == SqliteConstraintCheckErrorCode ||
                               (ex.SqliteErrorCode == SqliteConstraintErrorCode &&
                                ex.Message?.IndexOf("CHECK constraint failed", StringComparison.OrdinalIgnoreCase) >= 0);

            if (!isConstraint)
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(ex.Message))
            {
                var match = SqliteLengthConstraintRegex.Match(ex.Message);
                if (match.Success)
                {
                    columnName = match.Groups["column"].Value.Trim('\"');
                    if (int.TryParse(match.Groups["limit"].Value, out var parsedLimit))
                    {
                        limit = parsedLimit;
                    }
                    return true;
                }

                var nameMatch = SqliteConstraintNameRegex.Match(ex.Message);
                if (nameMatch.Success)
                {
                    columnName = nameMatch.Groups["column"].Value;
                    return true;
                }
            }

            return true;
        }

        private static string NormalizeColumnKey(string? columnName)
        {
            if (string.IsNullOrWhiteSpace(columnName)) return string.Empty;

            var trimmed = columnName.Trim();
            var lowered = trimmed.ToLowerInvariant();
            if (ColumnLengthHints.ContainsKey(lowered))
                return lowered;

            var snake = ToSnakeCase(trimmed);
            if (ColumnLengthHints.ContainsKey(snake))
                return snake;

            return lowered;
        }

        private static string ToSnakeCase(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;

            var builder = new StringBuilder(value.Length + 5);
            for (var i = 0; i < value.Length; i++)
            {
                var c = value[i];
                if (char.IsUpper(c))
                {
                    if (i > 0 && value[i - 1] != '_')
                        builder.Append('_');
                    builder.Append(char.ToLowerInvariant(c));
                }
                else
                {
                    builder.Append(char.ToLowerInvariant(c));
                }
            }

            return builder.ToString();
        }

        private Guid? CurrentUserId()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private ContractResponse ToResponse(Contract c, Guid? currentUserId)
        {
            var myVote = currentUserId is null
                ? (int?)null
                : c.Votes.Where(v => v.UserId == currentUserId.Value).Select(v => (int?)v.Value).FirstOrDefault();

            var score = c.Votes.Select(v => (int?)v.Value).Sum() ?? 0;

            string? url = null;
            if (!string.IsNullOrWhiteSpace(c.FilePath))
            {
                var req = HttpContext.Request;
                url = $"{req.Scheme}://{req.Host}/{c.FilePath.Replace("\\", "/")}";
            }

            return new ContractResponse(
                c.Id, c.Title, c.Description, c.Status, c.RequestId, c.CreatedByUserId,
                c.CreatedAt, c.UpdatedAt, score, myVote, url, c.FileName,
                c.SupplierName, c.Quantity, c.CargoType, c.CountryOfOrigin, c.PricePerTon,
                c.PaymentMethod, c.ShippingMethod, c.ContractTerms, c.StartDate, c.EndDate, c.ReviewNotes
            );
        }

        private async Task<(string? relPath, string? originalName)> SaveContractFileAsync(IFormFile? file)
        {
            if (file is null || file.Length == 0) return (null, null);

            if (!FileUploadValidator.IsValid(file, out var error))
                throw new InvalidOperationException(error);

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", "contracts");
            Directory.CreateDirectory(dir);

            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(dir, safeName);

            using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            var rel = Path.Combine("uploads", "contracts", safeName).Replace("\\", "/");
            return (rel, Path.GetFileName(file.FileName));
        }

        // -------- LIST & GET --------

        // GET /api/contracts
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ContractResponse>>> GetAll([FromQuery] string? status, [FromQuery] Guid? requestId)
        {
            var uid = CurrentUserId();

            var q = _db.Contracts
                .Include(c => c.Votes)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(c => c.Status == status);

            if (requestId is not null)
                q = q.Where(c => c.RequestId == requestId);

            var items = await q.OrderByDescending(c => c.CreatedAt).ToListAsync();
            return items.Select(c => ToResponse(c, uid)).ToList();
        }

        // GET /api/contracts/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ContractResponse>> GetOne(Guid id)
        {
            var uid = CurrentUserId();

            var c = await _db.Contracts
                .Include(x => x.Votes)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c is null) return NotFound();
            return ToResponse(c, uid);
        }

        // -------- CREATE --------

        // POST /api/contracts  (JSON)
        [HttpPost]
        [Consumes("application/json")]
        public async Task<ActionResult<ContractResponse>> CreateJson([FromBody] ContractCreateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest(new { message = "Title is required." });

            if (req.RequestId is Guid rid && !await RequestExistsAsync(rid))
                return BadRequest(new { message = "The selected request could not be found." });

            var c = new Contract
            {
                Title = req.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
                RequestId = req.RequestId,
                Status = "Draft",
                CreatedByUserId = CurrentUserId(),
                SupplierName = string.IsNullOrWhiteSpace(req.SupplierName) ? null : req.SupplierName.Trim(),
                Quantity = req.Quantity,
                CargoType = string.IsNullOrWhiteSpace(req.CargoType) ? null : req.CargoType.Trim(),
                CountryOfOrigin = string.IsNullOrWhiteSpace(req.CountryOfOrigin) ? null : req.CountryOfOrigin.Trim(),
                PricePerTon = req.PricePerTon,
                PaymentMethod = string.IsNullOrWhiteSpace(req.PaymentMethod) ? null : req.PaymentMethod.Trim(),
                ShippingMethod = string.IsNullOrWhiteSpace(req.ShippingMethod) ? null : req.ShippingMethod.Trim(),
                ContractTerms = string.IsNullOrWhiteSpace(req.ContractTerms) ? null : req.ContractTerms.Trim(),
                StartDate = req.StartDate,
                EndDate = req.EndDate,
                ReviewNotes = string.IsNullOrWhiteSpace(req.ReviewNotes) ? null : req.ReviewNotes.Trim()
            };

            _db.Contracts.Add(c);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return HandleContractSaveFailure(ex);
            }
            await _db.Entry(c).Collection(x => x.Votes).LoadAsync();

            return CreatedAtAction(nameof(GetOne), new { id = c.Id }, ToResponse(c, CurrentUserId()));
        }

        // POST /api/contracts  (multipart/form-data with optional file "contractFile")
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<ContractResponse>> CreateForm(
            [FromForm] string title,
            [FromForm] string? description,
            [FromForm] string? requestId,
            [FromForm] string? supplierName,
            [FromForm] decimal? quantity,
            [FromForm] string? cargoType,
            [FromForm] string? countryOfOrigin,
            [FromForm] decimal? pricePerTon,
            [FromForm] string? paymentMethod,
            [FromForm] string? shippingMethod,
            [FromForm] string? contractTerms,
            [FromForm] DateTime? startDate,
            [FromForm] DateTime? endDate,
            [FromForm] string? reviewNotes,
            [FromForm(Name = "contractFile")] IFormFile? file)
        {
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { message = "Title is required." });

            var c = new Contract
            {
                Title = title.Trim(),
                Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
                 RequestId = Guid.TryParse(requestId, out var parsedRequestId) ? parsedRequestId : null,
                Status = "Draft",
                CreatedByUserId = CurrentUserId(),
                SupplierName = string.IsNullOrWhiteSpace(supplierName) ? null : supplierName.Trim(),
                Quantity = quantity,
                CargoType = string.IsNullOrWhiteSpace(cargoType) ? null : cargoType.Trim(),
                CountryOfOrigin = string.IsNullOrWhiteSpace(countryOfOrigin) ? null : countryOfOrigin.Trim(),
                PricePerTon = pricePerTon,
                PaymentMethod = string.IsNullOrWhiteSpace(paymentMethod) ? null : paymentMethod.Trim(),
                ShippingMethod = string.IsNullOrWhiteSpace(shippingMethod) ? null : shippingMethod.Trim(),
                ContractTerms = string.IsNullOrWhiteSpace(contractTerms) ? null : contractTerms.Trim(),
                StartDate = startDate,
                EndDate = endDate,
                ReviewNotes = string.IsNullOrWhiteSpace(reviewNotes) ? null : reviewNotes.Trim()
            };

            if (c.RequestId is Guid existingRequestId && !await RequestExistsAsync(existingRequestId))
                return BadRequest(new { message = "The selected request could not be found." });

            if (file is not null)
            {
                try
                {
                    var (rel, original) = await SaveContractFileAsync(file);
                    c.FilePath = rel;
                    c.FileName = original;
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            _db.Contracts.Add(c);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return HandleContractSaveFailure(ex);
            }
            await _db.Entry(c).Collection(x => x.Votes).LoadAsync();

            return CreatedAtAction(nameof(GetOne), new { id = c.Id }, ToResponse(c, CurrentUserId()));
        }

        // -------- UPDATE --------

        // PUT /api/contracts/{id} (JSON)
        [HttpPut("{id:guid}")]
        [Consumes("application/json")]
        public async Task<ActionResult<ContractResponse>> UpdateJson(Guid id, [FromBody] ContractUpdateRequest req)
        {
            var c = await _db.Contracts.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (c is null) return NotFound();

            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest(new { message = "Title is required." });

            if (req.RequestId is Guid rid && !await RequestExistsAsync(rid))
                return BadRequest(new { message = "The selected request could not be found." });

            c.Title = req.Title.Trim();
            c.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
            c.RequestId = req.RequestId;
            c.SupplierName = string.IsNullOrWhiteSpace(req.SupplierName) ? null : req.SupplierName.Trim();
            c.Quantity = req.Quantity;
            c.CargoType = string.IsNullOrWhiteSpace(req.CargoType) ? null : req.CargoType.Trim();
            c.CountryOfOrigin = string.IsNullOrWhiteSpace(req.CountryOfOrigin) ? null : req.CountryOfOrigin.Trim();
            c.PricePerTon = req.PricePerTon;
            c.PaymentMethod = string.IsNullOrWhiteSpace(req.PaymentMethod) ? null : req.PaymentMethod.Trim();
            c.ShippingMethod = string.IsNullOrWhiteSpace(req.ShippingMethod) ? null : req.ShippingMethod.Trim();
            c.ContractTerms = string.IsNullOrWhiteSpace(req.ContractTerms) ? null : req.ContractTerms.Trim();
            c.StartDate = req.StartDate;
            c.EndDate = req.EndDate;
            c.ReviewNotes = string.IsNullOrWhiteSpace(req.ReviewNotes) ? null : req.ReviewNotes.Trim();
            c.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return HandleContractSaveFailure(ex);
            }
            return ToResponse(c, CurrentUserId());
        }

        // PUT /api/contracts/{id}/upload (multipart/form-data)
        [HttpPut("{id:guid}/upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<ContractResponse>> UpdateForm(
            Guid id,
            [FromForm] string title,
            [FromForm] string? description,
            [FromForm] string? requestId,
            [FromForm] string? supplierName,
            [FromForm] decimal? quantity,
            [FromForm] string? cargoType,
            [FromForm] string? countryOfOrigin,
            [FromForm] decimal? pricePerTon,
            [FromForm] string? paymentMethod,
            [FromForm] string? shippingMethod,
            [FromForm] string? contractTerms,
            [FromForm] DateTime? startDate,
            [FromForm] DateTime? endDate,
            [FromForm] string? reviewNotes,
            [FromForm(Name = "contractFile")] IFormFile? file)
        {
            var c = await _db.Contracts.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (c is null) return NotFound();

            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { message = "Title is required." });

            c.Title = title.Trim();
            c.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
            if (requestId is not null)
            {
                if (string.IsNullOrWhiteSpace(requestId) || requestId.Equals("none", StringComparison.OrdinalIgnoreCase))
                {
                    c.RequestId = null;
                }
                else if (Guid.TryParse(requestId, out var rid))
                {
                    if (!await RequestExistsAsync(rid))
                        return BadRequest(new { message = "The selected request could not be found." });

                    c.RequestId = rid;
                }
                else
                {
                    return BadRequest(new { message = "Invalid request id." });
                }
            }
            c.SupplierName = string.IsNullOrWhiteSpace(supplierName) ? c.SupplierName : supplierName.Trim();
            c.Quantity = quantity ?? c.Quantity;
            c.CargoType = string.IsNullOrWhiteSpace(cargoType) ? c.CargoType : cargoType.Trim();
            c.CountryOfOrigin = string.IsNullOrWhiteSpace(countryOfOrigin) ? c.CountryOfOrigin : countryOfOrigin.Trim();
            c.PricePerTon = pricePerTon ?? c.PricePerTon;
            c.PaymentMethod = string.IsNullOrWhiteSpace(paymentMethod) ? c.PaymentMethod : paymentMethod.Trim();
            c.ShippingMethod = string.IsNullOrWhiteSpace(shippingMethod) ? c.ShippingMethod : shippingMethod.Trim();
            c.ContractTerms = string.IsNullOrWhiteSpace(contractTerms) ? c.ContractTerms : contractTerms.Trim();
            c.StartDate = startDate ?? c.StartDate;
            c.EndDate = endDate ?? c.EndDate;
            c.ReviewNotes = string.IsNullOrWhiteSpace(reviewNotes) ? c.ReviewNotes : reviewNotes.Trim();

            if (file is not null)
            {
                try
                {
                    var (rel, original) = await SaveContractFileAsync(file);
                    c.FilePath = rel;
                    c.FileName = original;
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            c.UpdatedAt = DateTime.UtcNow;
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return HandleContractSaveFailure(ex);
            }

            return ToResponse(c, CurrentUserId());
        }

        // -------- DELETE --------

        // DELETE /api/contracts/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var c = await _db.Contracts.FindAsync(id);
            if (c is null) return NotFound();

            _db.Contracts.Remove(c);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // -------- STATUS --------

        // POST /api/contracts/{id}/status  { status: "Active" }
        [HttpPost("{id:guid}/status")]
        public async Task<ActionResult<ContractResponse>> ChangeStatus(Guid id, [FromBody] ContractStatusChangeRequest body)
        {
            if (string.IsNullOrWhiteSpace(body.Status) || !AllowedStatuses.Contains(body.Status))
                return BadRequest(new { message = "Invalid status." });

            var c = await _db.Contracts.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (c is null) return NotFound();

            var current = c.Status;
            var nexts = AllowedTransitions.TryGetValue(current, out var allowed) ? allowed : Array.Empty<string>();
            if (!nexts.Contains(body.Status, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Transition from '{current}' to '{body.Status}' is not allowed." });

            c.Status = body.Status;
            c.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ToResponse(c, CurrentUserId());
        }

        // -------- VOTES --------

        // POST /api/contracts/{id}/votes  { approve: true } OR { value: 1/-1 }
        [HttpPost("{id:guid}/votes")]
        public async Task<ActionResult<ContractResponse>> Vote(Guid id, [FromBody] ContractVoteRequest body)
        {
            var uid = CurrentUserId();
            if (uid is null) return Unauthorized();

            var c = await _db.Contracts.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (c is null) return NotFound();

            int? value = body.Value;
            if (value is null && body.Approve is not null)
                value = body.Approve.Value ? 1 : -1;

            if (value is null || (value != -1 && value != 1))
                return BadRequest(new { message = "Vote 'value' must be -1 or 1 (or use approve: true/false)." });

            var existing = c.Votes.FirstOrDefault(v => v.UserId == uid.Value);

            if (existing is null)
            {
                c.Votes.Add(new ContractVote
                {
                    ContractId = c.Id,
                    UserId = uid.Value,
                    Value = value.Value,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                if (existing.Value == value.Value)
                {
                    _db.ContractVotes.Remove(existing); // toggle off
                }
                else
                {
                    existing.Value = value.Value;
                    existing.CreatedAt = DateTime.UtcNow;
                }
            }

            c.UpdatedAt = DateTime.UtcNow;
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Concurrency conflict while saving vote on contract {ContractId} by user {UserId}",
                    id,
                    uid);
                return Conflict(new
                {
                    message = "This contract's votes changed while you were voting. Please reload and try again."
                });
            }

            await _db.Entry(c).Collection(x => x.Votes).LoadAsync();

            return ToResponse(c, uid);
        }
    }
}
