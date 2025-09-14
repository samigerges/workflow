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
    [Route("api/requests")]
    [Authorize]
    public class RequestsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private static readonly HashSet<RequestStatus> AllowedStatuses = Enum.GetValues<RequestStatus>().ToHashSet();

        private static readonly Dictionary<RequestStatus, RequestStatus[]> AllowedTransitions = new()
        {
            [RequestStatus.Draft]     = new[] { RequestStatus.Submitted, RequestStatus.Archived },
            [RequestStatus.Submitted] = new[] { RequestStatus.Approved, RequestStatus.Rejected, RequestStatus.Archived },
            [RequestStatus.Approved]  = new[] { RequestStatus.Archived },
            [RequestStatus.Rejected]  = new[] { RequestStatus.Archived },
            [RequestStatus.Archived]  = Array.Empty<RequestStatus>()
        };

        public RequestsController(AppDbContext db) => _db = db;

        private Guid? CurrentUserId()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private static RequestResponse ToResponse(Request r, Guid? currentUserId)
        {
            var myVote = currentUserId is null
                ? (int?)null
                : r.Votes.Where(v => v.UserId == currentUserId.Value).Select(v => (int?)v.Value).FirstOrDefault();

            var score = r.Votes.Select(v => (int?)v.Value).Sum() ?? 0;

            return new RequestResponse(
                r.Id, r.Title, r.Description, r.Status, r.NeedId, r.CreatedByUserId,
                r.CreatedAt, r.UpdatedAt, score, myVote
            );
        }

        // GET /api/requests
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RequestResponse>>> GetAll([FromQuery] RequestStatus? status, [FromQuery] Guid? needId)
        {
            var uid = CurrentUserId();

            var q = _db.Requests
                .Include(r => r.Votes)
                .AsQueryable();

            if (status is not null)
                q = q.Where(r => r.Status == status);

            if (needId is not null)
                q = q.Where(r => r.NeedId == needId);

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
            var r = new Request
            {
                Title = req.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
                NeedId = req.NeedId,
                Status = RequestStatus.Draft,
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

            r.Title = req.Title.Trim();
            r.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
            r.NeedId = req.NeedId;
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
            if (!AllowedStatuses.Contains(body.Status))
                return BadRequest(new { message = "Invalid status." });

            var r = await _db.Requests.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return NotFound();

            var current = r.Status;
            var allowed = AllowedTransitions.TryGetValue(current, out var nexts) ? nexts : Array.Empty<RequestStatus>();
            if (!allowed.Contains(body.Status))
                return BadRequest(new { message = $"Transition from '{current}' to '{body.Status}' is not allowed." });

            r.Status = body.Status;
            r.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ToResponse(r, CurrentUserId());
        }

        // POST /api/requests/{id}/votes   { approve: true } OR { value: 1 }
        [HttpPost("{id:guid}/votes")]
        public async Task<ActionResult<RequestResponse>> Vote(Guid id, [FromBody] RequestVoteRequest body)
        {
            var uid = CurrentUserId();
            if (uid is null) return Unauthorized();

            var r = await _db.Requests.Include(x => x.Votes).FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return NotFound();

            int? value = body.Value;
            if (value is null && body.Approve is not null)
                value = body.Approve.Value ? 1 : -1;

            if (value is null || (value != -1 && value != 1))
                return BadRequest(new { message = "Vote 'value' must be -1 or 1 (or use approve: true/false)." });

            var existing = r.Votes.FirstOrDefault(v => v.UserId == uid.Value);

            if (existing is null)
            {
                r.Votes.Add(new RequestVote
                {
                    RequestId = r.Id,
                    UserId = uid.Value,
                    Value = value.Value,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                if (existing.Value == value.Value)
                {
                    // Toggle off same vote
                    _db.RequestVotes.Remove(existing);
                }
                else
                {
                    existing.Value = value.Value;
                    existing.CreatedAt = DateTime.UtcNow;
                }
            }

            r.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Reload votes to reflect changes
            await _db.Entry(r).Collection(x => x.Votes).LoadAsync();

            return ToResponse(r, uid);
        }
    }
}
