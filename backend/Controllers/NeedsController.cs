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
        private readonly ILogger<NeedsController> _logger;

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "draft",
            "submitted",
            "approved",
            "in_progress",
            "fulfilled",
            "cancelled"
        };

        public NeedsController(AppDbContext db, ILogger<NeedsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        private Guid? CurrentUserId()
        {
            var idStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private static string NormalizeStatusOrDefault(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return "draft";
            }

            var normalized = status.Trim().ToLowerInvariant();
            return AllowedStatuses.Contains(normalized) ? normalized : "draft";
        }

        private static NeedResponse ToResponse(Need need)
        {
            return new NeedResponse(
                need.Id,
                need.Title,
                need.Description,
                NormalizeStatusOrDefault(need.Status),
                need.Category,
                need.RequiredQuantity,
                need.UnitOfMeasure,
                need.FulfillmentStartDate,
                need.FulfillmentEndDate,
                need.DepartmentCode,
                need.Notes,
                need.MaxPricePerUnit,
                need.ActualQuantityReceived,
                need.CreatedByUserId,
                need.CreatedAt,
                need.UpdatedAt
            );
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<NeedResponse>>> GetAll()
        {
            var needs = await _db.Needs
                .AsNoTracking()
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return needs.Select(ToResponse).ToList();
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<NeedResponse>> GetById(Guid id)
        {
            var need = await _db.Needs.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id);
            if (need is null)
            {
                return NotFound();
            }

            return ToResponse(need);
        }

        [HttpPost]
        public async Task<ActionResult<NeedResponse>> Create([FromBody] NeedCreateRequest body)
        {
            if (body.RequiredQuantity <= 0)
            {
                return ValidationProblem("RequiredQuantity must be greater than zero.");
            }

            if (body.FulfillmentEndDate < body.FulfillmentStartDate)
            {
                return ValidationProblem("FulfillmentEndDate must be on or after FulfillmentStartDate.");
            }

            if (body.MaxPricePerUnit is < 0)
            {
                return ValidationProblem("MaxPricePerUnit cannot be negative.");
            }

            var now = DateTime.UtcNow;
            var need = new Need
            {
                Title = body.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim(),
                Category = body.Category.Trim(),
                RequiredQuantity = body.RequiredQuantity,
                UnitOfMeasure = body.UnitOfMeasure.Trim(),
                FulfillmentStartDate = body.FulfillmentStartDate,
                FulfillmentEndDate = body.FulfillmentEndDate,
                DepartmentCode = string.IsNullOrWhiteSpace(body.DepartmentCode) ? null : body.DepartmentCode.Trim(),
                Notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim(),
                MaxPricePerUnit = body.MaxPricePerUnit,
                Status = NormalizeStatusOrDefault(body.Status),
                CreatedAt = now,
                UpdatedAt = now,
                CreatedByUserId = CurrentUserId()
            };

            _db.Needs.Add(need);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Need {NeedId} created", need.Id);

            return CreatedAtAction(nameof(GetById), new { id = need.Id }, ToResponse(need));
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<NeedResponse>> Update(Guid id, [FromBody] NeedUpdateRequest body)
        {
            var need = await _db.Needs.FirstOrDefaultAsync(n => n.Id == id);
            if (need is null)
            {
                return NotFound();
            }

            if (body.RequiredQuantity is { } requiredQuantity && requiredQuantity <= 0)
            {
                return ValidationProblem("RequiredQuantity must be greater than zero.");
            }

            var newStartDate = body.FulfillmentStartDate ?? need.FulfillmentStartDate;
            var newEndDate = body.FulfillmentEndDate ?? need.FulfillmentEndDate;
            if (newEndDate < newStartDate)
            {
                return ValidationProblem("FulfillmentEndDate must be on or after FulfillmentStartDate.");
            }

            if (body.MaxPricePerUnit is < 0)
            {
                return ValidationProblem("MaxPricePerUnit cannot be negative.");
            }

            need.Title = body.Title is null ? need.Title : body.Title.Trim();
            need.Description = body.Description is null
                ? need.Description
                : string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim();
            need.Category = body.Category is null ? need.Category : body.Category.Trim();
            need.RequiredQuantity = body.RequiredQuantity ?? need.RequiredQuantity;
            need.UnitOfMeasure = body.UnitOfMeasure is null ? need.UnitOfMeasure : body.UnitOfMeasure.Trim();
            need.FulfillmentStartDate = newStartDate;
            need.FulfillmentEndDate = newEndDate;
            need.DepartmentCode = body.DepartmentCode is null
                ? need.DepartmentCode
                : string.IsNullOrWhiteSpace(body.DepartmentCode) ? null : body.DepartmentCode.Trim();
            need.Notes = body.Notes is null
                ? need.Notes
                : string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim();
            need.MaxPricePerUnit = body.MaxPricePerUnit ?? need.MaxPricePerUnit;
            need.Status = body.Status is null ? need.Status : NormalizeStatusOrDefault(body.Status);
            if (body.ActualQuantityReceived is not null)
            {
                need.ActualQuantityReceived = Math.Max(0, body.ActualQuantityReceived.Value);
            }

            need.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Need {NeedId} updated", need.Id);

            return ToResponse(need);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var need = await _db.Needs.FirstOrDefaultAsync(n => n.Id == id);
            if (need is null)
            {
                return NotFound();
            }

            _db.Needs.Remove(need);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Need {NeedId} deleted", id);

            return NoContent();
        }
    }
}
