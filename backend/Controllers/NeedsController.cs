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
    [Route("api/needs")]
    [Authorize]
    public class NeedsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private static readonly string[] ValidStatuses = new[] { "draft", "active", "in_progress", "fulfilled", "expired", "cancelled" };

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
                    n.UpdatedAt,
                    n.ActualQuantityReceived,
                    n.MaxPricePerUnit,
                    n.ProgressPercentage))
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
                n.UpdatedAt,
                n.ActualQuantityReceived,
                n.MaxPricePerUnit,
                n.ProgressPercentage);
        }

        [HttpPost]
        public async Task<ActionResult<NeedResponse>> Create([FromBody] NeedCreateRequest req)
        {
            var n = new Need
            {
                Title = req.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
                Category = req.Category.Trim(),
                RequiredQuantity = req.RequiredQuantity,
                UnitOfMeasure = req.UnitOfMeasure.Trim(),
                ActualQuantityReceived = req.ActualQuantityReceived ?? 0,
                MaxPricePerUnit = req.MaxPricePerUnit,
                // Ensure incoming dates are treated as UTC to avoid PostgreSQL errors
                FulfillmentStartDate = DateTime.SpecifyKind(req.FulfillmentStartDate, DateTimeKind.Utc),
                FulfillmentEndDate = DateTime.SpecifyKind(req.FulfillmentEndDate, DateTimeKind.Utc),
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
                n.UpdatedAt,
                n.ActualQuantityReceived,
                n.MaxPricePerUnit,
                n.ProgressPercentage);
            return CreatedAtAction(nameof(GetOne), new { id = n.Id }, res);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<NeedResponse>> Update(Guid id, [FromBody] NeedUpdateRequest req)
        {
            var n = await _db.Needs.FindAsync(id);
            if (n is null) return NotFound();

            n.Title = req.Title.Trim();
            n.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
            if (!string.IsNullOrWhiteSpace(req.Status))
            {
                var status = req.Status.Trim().ToLower();
                if (!ValidStatuses.Contains(status)) return BadRequest("Invalid status");
                n.Status = status;
            }
            n.Category = req.Category.Trim();
            n.RequiredQuantity = req.RequiredQuantity;
            n.UnitOfMeasure = req.UnitOfMeasure.Trim();
            if (req.ActualQuantityReceived.HasValue) n.ActualQuantityReceived = req.ActualQuantityReceived.Value;
            if (req.MaxPricePerUnit.HasValue) n.MaxPricePerUnit = req.MaxPricePerUnit;
            // Normalize to UTC before persisting
            n.FulfillmentStartDate = DateTime.SpecifyKind(req.FulfillmentStartDate, DateTimeKind.Utc);
            n.FulfillmentEndDate = DateTime.SpecifyKind(req.FulfillmentEndDate, DateTimeKind.Utc);
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
                n.UpdatedAt,
                n.ActualQuantityReceived,
                n.MaxPricePerUnit,
                n.ProgressPercentage);
        }

        [HttpPatch("{id:guid}/status")]
        public async Task<ActionResult<NeedResponse>> UpdateStatus(Guid id, [FromBody] NeedStatusUpdateRequest req)
        {
            var status = req.Status.Trim().ToLower();
            if (!ValidStatuses.Contains(status)) return BadRequest("Invalid status");
            var n = await _db.Needs.FindAsync(id);
            if (n is null) return NotFound();
            n.Status = status;
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
                n.UpdatedAt,
                n.ActualQuantityReceived,
                n.MaxPricePerUnit,
                n.ProgressPercentage);
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
