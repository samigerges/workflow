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
    [Route("api/needs")]
    [Authorize]
    public class NeedsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public NeedsController(AppDbContext db) => _db = db;

        private Guid? CurrentUserId()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<NeedResponse>>> GetAll()
        {
            var items = await _db.Needs
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NeedResponse(n.Id, n.Title, n.Description, n.Status, n.CreatedByUserId, n.CreatedAt, n.UpdatedAt))
                .ToListAsync();

            return items;
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<NeedResponse>> GetOne(Guid id)
        {
            var n = await _db.Needs.FindAsync(id);
            if (n is null) return NotFound();
            return new NeedResponse(n.Id, n.Title, n.Description, n.Status, n.CreatedByUserId, n.CreatedAt, n.UpdatedAt);
        }

        [HttpPost]
        public async Task<ActionResult<NeedResponse>> Create([FromBody] NeedCreateRequest req)
        {
            var n = new Need
            {
                Title = req.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
                Status = "Draft",
                CreatedByUserId = CurrentUserId()
            };

            _db.Needs.Add(n);
            await _db.SaveChangesAsync();

            var res = new NeedResponse(n.Id, n.Title, n.Description, n.Status, n.CreatedByUserId, n.CreatedAt, n.UpdatedAt);
            return CreatedAtAction(nameof(GetOne), new { id = n.Id }, res);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<NeedResponse>> Update(Guid id, [FromBody] NeedUpdateRequest req)
        {
            var n = await _db.Needs.FindAsync(id);
            if (n is null) return NotFound();

            n.Title = req.Title.Trim();
            n.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
            if (!string.IsNullOrWhiteSpace(req.Status)) n.Status = req.Status.Trim();
            n.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return new NeedResponse(n.Id, n.Title, n.Description, n.Status, n.CreatedByUserId, n.CreatedAt, n.UpdatedAt);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var n = await _db.Needs.FindAsync(id);
            if (n is null) return NotFound();
            _db.Needs.Remove(n);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
