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
    [Route("api/requests")]
    [Authorize]
    public class RequestsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<RequestsController> _logger;
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "draft",
            "pending",
            "approved",
            "rejected",
            "contracted",
            "applied",
            "in_progress",
            "completed",
            "submitted",
            "archived"
        };

        public RequestsController(AppDbContext db, ILogger<RequestsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        private Guid? CurrentUserId()
        {
            var idStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private static string? NormalizeString(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string NormalizeStatusOrDefault(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "pending";

            var normalized = status.Trim().ToLowerInvariant();
            return AllowedStatuses.Contains(normalized) ? normalized : "pending";
        }

        private static bool TryNormalizeStatus(string? status, out string normalized)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                normalized = string.Empty;
                return false;
            }

            normalized = status.Trim().ToLowerInvariant();
            return AllowedStatuses.Contains(normalized);
        }

        private static string ToVoteName(int value) => value switch
        {
            >= 1 => "yes",
            <= -1 => "no",
            _ => "pending"
        };

        private static bool TryResolveVoteValue(RequestVoteRequest body, out int value, out string? errorMessage)
        {
            value = 0;
            errorMessage = null;

            int? resolved = body.Value;

            if (resolved is null && body.Approve is not null)
                resolved = body.Approve.Value ? 1 : -1;

            if (resolved is null && !string.IsNullOrWhiteSpace(body.Vote))
            {
                var voteText = body.Vote.Trim().ToLowerInvariant();
                resolved = voteText switch
                {
                    "yes" or "approve" or "approved" or "1" => 1,
                    "no" or "reject" or "rejected" or "-1" => -1,
                    _ => null
                };

                if (resolved is null)
                {
                    errorMessage = "Vote must be 'yes' or 'no'.";
                    return false;
                }
            }

            if (resolved is null)
            {
                errorMessage = "Vote 'value' must be -1 or 1 (or use vote: 'yes'/'no' or approve: true/false).";
                return false;
            }

            if (resolved != 1 && resolved != -1)
            {
                errorMessage = "Vote 'value' must be -1 or 1 (or use vote: 'yes'/'no').";
                return false;
            }

            value = resolved.Value;
            return true;
        }

        private static RequestResponse ToResponse(Request r, Guid? currentUserId)
        {
            var myVote = currentUserId is null
                ? (int?)null
                : r.Votes.Where(v => v.UserId == currentUserId.Value).Select(v => (int?)v.Value).FirstOrDefault();

            var score = r.Votes.Select(v => (int?)v.Value).Sum() ?? 0;

            var status = NormalizeStatusOrDefault(r.Status);

            return new RequestResponse(
                r.Id,
                r.Title,
                r.Description,
                status,
                r.CreatedByUserId,
                r.CreatedAt,
                r.UpdatedAt,
                score,
                myVote,
                r.Quantity,
                r.UnitOfMeasure,
                r.CargoType,
                r.PricePerTon,
                r.SupplierName,
                r.CountryOfOrigin,
                r.PaymentMethod,
                r.ShippingMethod,
                r.LetterOfGuarantee,
                r.StartDate,
                r.EndDate,
                r.UploadedFile
            );
        }

        // GET /api/requests
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RequestResponse>>> GetAll([FromQuery] string? status)
        {
            var uid = CurrentUserId();

            var q = _db.Requests
                .Include(r => r.Votes)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(r => r.Status == status);

            var items = await q
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return items.Select(r => ToResponse(r, uid)).ToList();
        }

        // GET /api/requests/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<RequestResponse>> GetOne(Guid id)
        {
            var uid = CurrentUserId();

            var r = await _db.Requests
                .Include(x => x.Votes)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (r is null) return NotFound();
            return ToResponse(r, uid);
        }

        // POST /api/requests
        [HttpPost]
        public async Task<ActionResult<RequestResponse>> Create([FromBody] RequestCreateRequest req)
        {
            var title = req.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { message = "Title is required." });

            var r = new Request
            {
                Title = title,
                Description = NormalizeString(req.Description),
                Status = NormalizeStatusOrDefault(req.Status),
                Quantity = req.Quantity,
                UnitOfMeasure = NormalizeString(req.UnitOfMeasure),
                CargoType = NormalizeString(req.CargoType),
                PricePerTon = req.PricePerTon,
                SupplierName = NormalizeString(req.SupplierName),
                CountryOfOrigin = NormalizeString(req.CountryOfOrigin),
                PaymentMethod = NormalizeString(req.PaymentMethod),
                ShippingMethod = NormalizeString(req.ShippingMethod),
                LetterOfGuarantee = NormalizeString(req.LetterOfGuarantee),
                StartDate = req.StartDate?.Date,
                EndDate = req.EndDate?.Date,
                UploadedFile = NormalizeString(req.UploadedFile),
                CreatedByUserId = CurrentUserId()
            };

            _db.Requests.Add(r);
            await _db.SaveChangesAsync();

            // Reload with votes (empty) to keep projection consistent
            await _db.Entry(r).Collection(x => x.Votes).LoadAsync();

            return CreatedAtAction(nameof(GetOne), new { id = r.Id }, ToResponse(r, CurrentUserId()));
        }

        // PUT /api/requests/{id}
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<RequestResponse>> Update(Guid id, [FromBody] RequestUpdateRequest req)
        {
            var r = await _db.Requests.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return NotFound();

            if (req.Title is not null)
            {
                var title = req.Title.Trim();
                if (string.IsNullOrWhiteSpace(title))
                    return BadRequest(new { message = "Title is required." });

                r.Title = title;
            }

            if (req.Description is not null)
                r.Description = NormalizeString(req.Description);

            if (req.Quantity.HasValue)
                r.Quantity = req.Quantity;

            if (req.UnitOfMeasure is not null)
                r.UnitOfMeasure = NormalizeString(req.UnitOfMeasure);

            if (req.CargoType is not null)
                r.CargoType = NormalizeString(req.CargoType);

            if (req.PricePerTon.HasValue)
                r.PricePerTon = req.PricePerTon;

            if (req.SupplierName is not null)
                r.SupplierName = NormalizeString(req.SupplierName);

            if (req.CountryOfOrigin is not null)
                r.CountryOfOrigin = NormalizeString(req.CountryOfOrigin);

            if (req.PaymentMethod is not null)
                r.PaymentMethod = NormalizeString(req.PaymentMethod);

            if (req.ShippingMethod is not null)
                r.ShippingMethod = NormalizeString(req.ShippingMethod);

            if (req.LetterOfGuarantee is not null)
                r.LetterOfGuarantee = NormalizeString(req.LetterOfGuarantee);

            if (req.StartDate.HasValue)
                r.StartDate = req.StartDate.Value.Date;

            if (req.EndDate.HasValue)
                r.EndDate = req.EndDate.Value.Date;

            if (req.UploadedFile is not null)
                r.UploadedFile = NormalizeString(req.UploadedFile);

            if (req.Status is not null)
            {
                if (!TryNormalizeStatus(req.Status, out var newStatus))
                    return BadRequest(new { message = "Invalid status." });

                r.Status = newStatus;
            }

            r.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return ToResponse(r, CurrentUserId());
        }

        // DELETE /api/requests/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var r = await _db.Requests.FindAsync(id);
            if (r is null) return NotFound();

            _db.Requests.Remove(r);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST /api/requests/{id}/status  { status: "Submitted" }
        [HttpPost("{id:guid}/status")]
        public async Task<ActionResult<RequestResponse>> ChangeStatus(Guid id, [FromBody] RequestStatusChangeRequest body)
        {
            if (!TryNormalizeStatus(body.Status, out var newStatus))
                return BadRequest(new { message = "Invalid status." });

            var r = await _db.Requests.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return NotFound();

            r.Status = newStatus;
            r.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ToResponse(r, CurrentUserId());
        }

        // GET /api/requests/{id}/votes
        [HttpGet("{id:guid}/votes")]
        public async Task<ActionResult<IEnumerable<RequestVoteResponse>>> GetVotes(Guid id)
        {
            var requestExists = await _db.Requests.AsNoTracking().AnyAsync(r => r.Id == id);
            if (!requestExists) return NotFound();

            var votes = await _db.RequestVotes
                .Where(v => v.RequestId == id)
                .Include(v => v.User)
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync();

            var responses = votes.Select(v => new RequestVoteResponse(
                v.Id,
                v.RequestId,
                v.UserId,
                ToVoteName(v.Value),
                v.Comment,
                v.CreatedAt,
                v.User is null ? null : new VoteUserResponse(v.User.Id, v.User.FirstName, v.User.LastName)
            )).ToList();

            return responses;
        }

        // POST /api/requests/{id}/votes   { approve: true } OR { value: 1 }
        [HttpPost("{id:guid}/votes")]
        public async Task<ActionResult<RequestResponse>> Vote(Guid id, [FromBody] RequestVoteRequest body)
        {
            var uid = CurrentUserId();
            if (uid is null) return Unauthorized();

            var r = await _db.Requests.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return NotFound();

            if (!TryResolveVoteValue(body, out var value, out var error))
                return BadRequest(new { message = error });

            var comment = string.IsNullOrWhiteSpace(body.Comment)
                ? null
                : body.Comment.Trim();

            if (comment is not null && comment.Length > 2000)
                comment = comment[..2000];

            var existing = r.Votes.FirstOrDefault(v => v.UserId == uid.Value);

            if (existing is null)
            {
                r.Votes.Add(new RequestVote
                {
                    RequestId = r.Id,
                    UserId = uid.Value,
                    Value = value,
                    Comment = comment,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                if (existing.Value == value && string.Equals(existing.Comment, comment, StringComparison.Ordinal))
                {
                    // Toggle off same vote
                    _db.RequestVotes.Remove(existing);
                }
                else
                {
                    existing.Value = value;
                    existing.Comment = comment;
                    existing.CreatedAt = DateTime.UtcNow;
                }
            }

            r.UpdatedAt = DateTime.UtcNow;
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Concurrency conflict while saving vote on request {RequestId} by user {UserId}",
                    id,
                    uid);
                return Conflict(new
                {
                    message = "This request's votes changed while you were voting. Please reload and try again."
                });
            }

            // Reload votes to reflect changes
            await _db.Entry(r).Collection(x => x.Votes).LoadAsync();

            return ToResponse(r, uid);
        }
    }
}
