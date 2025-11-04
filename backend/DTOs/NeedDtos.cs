using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public class NeedCreateRequest
    {
        [Required, MaxLength(200)]
        public string Title { get; init; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; init; }

        [Required, MaxLength(100)]
        public string Category { get; init; } = string.Empty;

        public decimal RequiredQuantity { get; init; }

        [Required, MaxLength(50)]
        public string UnitOfMeasure { get; init; } = string.Empty;

        public DateTime FulfillmentStartDate { get; init; }

        public DateTime FulfillmentEndDate { get; init; }

        [MaxLength(50)]
        public string? DepartmentCode { get; init; }

        [MaxLength(2000)]
        public string? Notes { get; init; }

        public decimal? MaxPricePerUnit { get; init; }

        [MaxLength(50)]
        public string? Status { get; init; }
    }

    public class NeedUpdateRequest
    {
        [MaxLength(200)]
        public string? Title { get; init; }

        [MaxLength(2000)]
        public string? Description { get; init; }

        [MaxLength(100)]
        public string? Category { get; init; }

        public decimal? RequiredQuantity { get; init; }

        [MaxLength(50)]
        public string? UnitOfMeasure { get; init; }

        public DateTime? FulfillmentStartDate { get; init; }

        public DateTime? FulfillmentEndDate { get; init; }

        [MaxLength(50)]
        public string? DepartmentCode { get; init; }

        [MaxLength(2000)]
        public string? Notes { get; init; }

        public decimal? MaxPricePerUnit { get; init; }

        [MaxLength(50)]
        public string? Status { get; init; }

        public int? ActualQuantityReceived { get; init; }
    }

    public record NeedResponse(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        string Category,
        decimal RequiredQuantity,
        string UnitOfMeasure,
        DateTime FulfillmentStartDate,
        DateTime FulfillmentEndDate,
        string? DepartmentCode,
        string? Notes,
        decimal? MaxPricePerUnit,
        int ActualQuantityReceived,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );
}
