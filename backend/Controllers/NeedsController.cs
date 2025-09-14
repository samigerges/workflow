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
                .Select(n => new NeedResponse(
                    n.Id,
                    n.Title,
                    n.Description,
                    n.Status,
                    n.Category,
                    n.RequiredQuantity,
                    n.UnitOfMeasure,
                    n.FulfillmentStartDate,
                    n.FulfillmentEndDate,
                    n.DepartmentCode,
                    n.Notes,
                    n.CreatedByUserId,
                    n.CreatedAt,
                    n.UpdatedAt))
                .ToListAsync();

            return items;
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<NeedResponse>> GetOne(Guid id)
        {
            var n = await _db.Needs.FindAsync(id);
            if (n is null) return NotFound();
            return new NeedResponse(
                n.Id,
                n.Title,
                n.Description,
                n.Status,
                n.Category,
                n.RequiredQuantity,
                n.UnitOfMeasure,
                n.FulfillmentStartDate,
                n.FulfillmentEndDate,
                n.DepartmentCode,
                n.Notes,
                n.CreatedByUserId,
                n.CreatedAt,
                n.UpdatedAt);
        }

        [HttpPost]
        public async Task<ActionResult<NeedResponse>> Create([FromBody] NeedCreateRequest req)
        {
            var n = new Need
            {
                Title = req.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
                Status = "Draft",
                Category = req.Category.Trim(),
                RequiredQuantity = req.RequiredQuantity,
                UnitOfMeasure = req.UnitOfMeasure.Trim(),
                FulfillmentStartDate = req.FulfillmentStartDate,
                FulfillmentEndDate = req.FulfillmentEndDate,
                DepartmentCode = string.IsNullOrWhiteSpace(req.DepartmentCode) ? null : req.DepartmentCode.Trim(),
                Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
                CreatedByUserId = CurrentUserId()
            };

            _db.Needs.Add(n);
            await _db.SaveChangesAsync();

            var res = new NeedResponse(
                n.Id,
                n.Title,
                n.Description,
                n.Status,
                n.Category,
                n.RequiredQuantity,
                n.UnitOfMeasure,
                n.FulfillmentStartDate,
                n.FulfillmentEndDate,
                n.DepartmentCode,
                n.Notes,
                n.CreatedByUserId,
                n.CreatedAt,
                n.UpdatedAt);
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
            n.Category = req.Category.Trim();
            n.RequiredQuantity = req.RequiredQuantity;
            n.UnitOfMeasure = req.UnitOfMeasure.Trim();
            n.FulfillmentStartDate = req.FulfillmentStartDate;
            n.FulfillmentEndDate = req.FulfillmentEndDate;
            n.DepartmentCode = string.IsNullOrWhiteSpace(req.DepartmentCode) ? null : req.DepartmentCode.Trim();
            n.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
            n.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return new NeedResponse(
                n.Id,
                n.Title,
                n.Description,
                n.Status,
                n.Category,
                n.RequiredQuantity,
                n.UnitOfMeasure,
                n.FulfillmentStartDate,
                n.FulfillmentEndDate,
                n.DepartmentCode,
                n.Notes,
                n.CreatedByUserId,
                n.CreatedAt,
                n.UpdatedAt);
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
