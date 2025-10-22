using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/ports")]
    [Authorize]
    public class PortsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PortsController(AppDbContext db)
        {
            _db = db;
        }

        private static string? NormalizeString(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return value.Trim();
        }

        private static string? NormalizeCode(string? code)
        {
            var normalized = NormalizeString(code);
            return normalized?.ToUpperInvariant();
        }

        private static DateTime? ToUtc(DateTime? value)
        {
            return value.HasValue
                ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
                : null;
        }

        private static PortResponse ToResponse(Port port) => new(
            port.Id,
            port.Name,
            port.Code,
            port.Country,
            port.Region,
            port.MaxConcurrentVessels,
            port.StorageCapacity,
            port.DailyThroughputCapacity,
            port.CreatedAt,
            port.UpdatedAt
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PortResponse>>> GetPorts()
        {
            var ports = await _db.Ports
                .AsNoTracking()
                .OrderBy(p => p.Name)
                .ToListAsync();

            return Ok(ports.Select(ToResponse));
        }

        [HttpPost]
        public async Task<ActionResult<PortResponse>> CreatePort([FromBody] PortUpsertRequest request)
        {
            var now = DateTime.UtcNow;
            var port = new Port
            {
                Name = request.Name.Trim(),
                Code = NormalizeCode(request.Code),
                Country = NormalizeString(request.Country),
                Region = NormalizeString(request.Region),
                MaxConcurrentVessels = request.MaxConcurrentVessels,
                StorageCapacity = request.StorageCapacity,
                DailyThroughputCapacity = request.DailyThroughputCapacity,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _db.Ports.Add(port);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPorts), new { id = port.Id }, ToResponse(port));
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<PortResponse>> UpdatePort(Guid id, [FromBody] PortUpsertRequest request)
        {
            var port = await _db.Ports.FirstOrDefaultAsync(p => p.Id == id);
            if (port is null)
            {
                return NotFound();
            }

            port.Name = request.Name.Trim();
            port.Code = NormalizeCode(request.Code);
            port.Country = NormalizeString(request.Country);
            port.Region = NormalizeString(request.Region);
            port.MaxConcurrentVessels = request.MaxConcurrentVessels;
            port.StorageCapacity = request.StorageCapacity;
            port.DailyThroughputCapacity = request.DailyThroughputCapacity;
            port.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(ToResponse(port));
        }

        [HttpPost("{id:guid}/schedules")]
        public async Task<ActionResult<PortResponse>> UpsertSchedule(Guid id, [FromBody] PortScheduleUpsertRequest request)
        {
            var port = await _db.Ports
                .Include(p => p.Schedules)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (port is null)
            {
                return NotFound();
            }

            var vessel = await _db.Vessels.FirstOrDefaultAsync(v => v.Id == request.VesselId);
            if (vessel is null)
            {
                return NotFound($"Vessel {request.VesselId} was not found");
            }

            var schedule = port.Schedules.FirstOrDefault(s => s.VesselId == request.VesselId);
            if (schedule is null)
            {
                schedule = new PortSchedule
                {
                    PortId = port.Id,
                    VesselId = request.VesselId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                port.Schedules.Add(schedule);
            }

            schedule.Eta = ToUtc(request.Eta);
            schedule.Etd = ToUtc(request.Etd);
            schedule.Quantity = request.Quantity;
            schedule.Status = NormalizeString(request.Status);
            schedule.IsForecast = request.IsForecast;
            schedule.UpdatedAt = DateTime.UtcNow;

            port.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(ToResponse(port));
        }

        [HttpGet("logistics")]
        public async Task<ActionResult<IEnumerable<PortLogisticsStatsDto>>> GetLogistics(
            [FromQuery] string? region,
            [FromQuery] Guid? portId,
            [FromQuery] Guid[]? portIds,
            [FromQuery] double? alertThreshold)
        {
            var threshold = alertThreshold ?? 0.8;
            if (double.IsNaN(threshold) || threshold <= 0)
            {
                threshold = 0.8;
            }

            threshold = Math.Clamp(threshold, 0.05, 0.99);

            var query = _db.Ports
                .AsNoTracking()
                .Include(p => p.Schedules)
                    .ThenInclude(s => s.Vessel)
                .AsQueryable();

            if (portId.HasValue)
            {
                query = query.Where(p => p.Id == portId.Value);
            }
            else if (portIds is { Length: > 0 })
            {
                query = query.Where(p => portIds.Contains(p.Id));
            }

            if (!string.IsNullOrWhiteSpace(region))
            {
                var normalizedRegion = region.Trim().ToLowerInvariant();
                query = query.Where(p => p.Region != null && p.Region.ToLower() == normalizedRegion);
            }

            var ports = await query.ToListAsync();
            var now = DateTime.UtcNow;

            var summaries = ports.Select(port =>
            {
                var assignments = port.Schedules
                    .Select(schedule =>
                    {
                        var vessel = schedule.Vessel;
                        var eta = schedule.Eta ?? vessel?.Eta;
                        var etd = schedule.Etd ?? vessel?.Etd;
                        var quantity = schedule.Quantity ?? vessel?.Quantity;

                        return new
                        {
                            Assignment = new PortVesselAssignmentDto(
                                schedule.VesselId,
                                vessel?.Name ?? "Unassigned",
                                vessel?.Status,
                                eta,
                                etd,
                                quantity,
                                schedule.IsForecast
                            ),
                            Eta = eta,
                            Etd = etd,
                        };
                    })
                    .OrderBy(a => a.Eta ?? DateTime.MaxValue)
                    .ToList();

                var assignmentDtos = assignments.Select(a => a.Assignment).ToList();
                var assignedCount = assignmentDtos.Count;

                var upcoming = assignments
                    .Where(a => a.Eta.HasValue && a.Eta.Value >= now)
                    .OrderBy(a => a.Eta!.Value)
                    .Select(a => new PortUpcomingArrivalDto(
                        a.Assignment.VesselId,
                        a.Assignment.VesselName,
                        a.Eta,
                        a.Assignment.IsForecast))
                    .Take(5)
                    .ToList();

                DateTime? nextArrival = upcoming.FirstOrDefault()?.Eta;

                var occupied = assignments.Count(a =>
                {
                    if (!a.Eta.HasValue)
                    {
                        return false;
                    }

                    var eta = a.Eta.Value;
                    var etd = a.Etd ?? eta.AddDays(2);
                    return eta <= now && etd >= now;
                });

                var totalQuantity = assignmentDtos.Sum(a => a.Quantity ?? 0m);
                var maxConcurrent = port.MaxConcurrentVessels ?? 0;
                var utilization = maxConcurrent > 0
                    ? Math.Clamp((double)assignedCount / maxConcurrent, 0d, 1d)
                    : 0d;

                var availableBerths = maxConcurrent > 0
                    ? Math.Max(0, maxConcurrent - occupied)
                    : 0;

                return new
                {
                    Port = port,
                    Assignments = (IReadOnlyList<PortVesselAssignmentDto>)assignmentDtos,
                    Upcoming = (IReadOnlyList<PortUpcomingArrivalDto>)upcoming,
                    AssignedCount = assignedCount,
                    Occupied = occupied,
                    Utilization = utilization,
                    AvailableBerths = availableBerths,
                    TotalQuantity = totalQuantity,
                    NextArrival = nextArrival,
                };
            }).ToList();

            var responses = new List<PortLogisticsStatsDto>(summaries.Count);

            foreach (var summary in summaries)
            {
                var port = summary.Port;
                var storageCapacity = port.StorageCapacity;
                decimal? remainingStorage = null;
                if (storageCapacity.HasValue)
                {
                    remainingStorage = Math.Max(0, storageCapacity.Value - summary.TotalQuantity);
                }

                var capacityAlert = port.MaxConcurrentVessels.HasValue
                    && port.MaxConcurrentVessels.Value > 0
                    && summary.Utilization >= threshold;

                var redistributionOptions = new List<PortRedistributionOptionDto>();
                if (capacityAlert)
                {
                    var alternatives = summaries
                        .Where(other => other.Port.Id != port.Id)
                        .OrderBy(other => other.Utilization)
                        .ThenByDescending(other => other.AvailableBerths)
                        .Take(3);

                    foreach (var alternative in alternatives)
                    {
                        decimal? alternativeRemaining = null;
                        if (alternative.Port.StorageCapacity.HasValue)
                        {
                            alternativeRemaining = Math.Max(0, alternative.Port.StorageCapacity.Value - alternative.TotalQuantity);
                        }

                        var rationale = $"{alternative.Port.Name} has {alternative.AvailableBerths} open berth(s) with utilisation {(alternative.Utilization * 100):F0}%";
                        redistributionOptions.Add(new PortRedistributionOptionDto(
                            alternative.Port.Id,
                            alternative.Port.Name,
                            alternative.Port.Region,
                            Math.Round(alternative.Utilization, 4),
                            alternative.AvailableBerths,
                            alternativeRemaining,
                            rationale
                        ));
                    }
                }

                responses.Add(new PortLogisticsStatsDto(
                    port.Id,
                    port.Name,
                    port.Region,
                    port.Country,
                    port.MaxConcurrentVessels,
                    port.StorageCapacity,
                    port.DailyThroughputCapacity,
                    summary.AssignedCount,
                    summary.Occupied,
                    summary.AvailableBerths,
                    Math.Round(summary.Utilization, 4),
                    capacityAlert,
                    summary.TotalQuantity,
                    remainingStorage,
                    summary.NextArrival,
                    summary.Upcoming,
                    summary.Assignments,
                    redistributionOptions
                ));
            }

            return Ok(responses);
        }
    }
}
