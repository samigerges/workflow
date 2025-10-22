using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record PortUpsertRequest(
        [property: Required, MaxLength(200)] string Name,
        [property: MaxLength(50)] string? Code,
        [property: MaxLength(100)] string? Country,
        [property: MaxLength(100)] string? Region,
        int? MaxConcurrentVessels,
        decimal? StorageCapacity,
        decimal? DailyThroughputCapacity
    );

    public record PortResponse(
        Guid Id,
        string Name,
        string? Code,
        string? Country,
        string? Region,
        int? MaxConcurrentVessels,
        decimal? StorageCapacity,
        decimal? DailyThroughputCapacity,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record PortScheduleUpsertRequest(
        Guid VesselId,
        DateTime? Eta,
        DateTime? Etd,
        decimal? Quantity,
        string? Status,
        bool IsForecast
    );

    public record PortVesselAssignmentDto(
        Guid VesselId,
        string VesselName,
        string? VesselStatus,
        DateTime? Eta,
        DateTime? Etd,
        decimal? Quantity,
        bool IsForecast
    );

    public record PortUpcomingArrivalDto(
        Guid VesselId,
        string VesselName,
        DateTime? Eta,
        bool IsForecast
    );

    public record PortRedistributionOptionDto(
        Guid TargetPortId,
        string TargetPortName,
        string? TargetRegion,
        double CapacityUtilization,
        int AvailableBerths,
        decimal? AdditionalCapacity,
        string Rationale
    );

    public record PortLogisticsStatsDto(
        Guid PortId,
        string PortName,
        string? Region,
        string? Country,
        int? MaxConcurrentVessels,
        decimal? StorageCapacity,
        decimal? DailyThroughputCapacity,
        int AssignedVessels,
        int OccupiedBerths,
        int AvailableBerths,
        double CapacityUtilization,
        bool CapacityAlert,
        decimal? TotalAssignedQuantity,
        decimal? RemainingStorageCapacity,
        DateTime? NextArrival,
        IReadOnlyList<PortUpcomingArrivalDto> UpcomingArrivals,
        IReadOnlyList<PortVesselAssignmentDto> Assignments,
        IReadOnlyList<PortRedistributionOptionDto> RedistributionOptions
    );
}
