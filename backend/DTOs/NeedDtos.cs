using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record NeedCreateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(2000)] string? Description,
        [param:Required, MaxLength(100)] string Category,
        [param:Required] int RequiredQuantity,
        [param:Required, MaxLength(50)] string UnitOfMeasure,
        [param:Required] DateTime FulfillmentStartDate, // Expected in UTC
        [param:Required] DateTime FulfillmentEndDate,   // Expected in UTC
        [param:MaxLength(50)] string? DepartmentCode,
        [param:MaxLength(2000)] string? Notes,
        int? ActualQuantityReceived,
        decimal? MaxPricePerUnit
    );

    public record NeedUpdateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(2000)] string? Description,
        [param:MaxLength(50)] string? Status,
        [param:Required, MaxLength(100)] string Category,
        [param:Required] int RequiredQuantity,
        [param:Required, MaxLength(50)] string UnitOfMeasure,
        [param:Required] DateTime FulfillmentStartDate, // Expected in UTC
        [param:Required] DateTime FulfillmentEndDate,   // Expected in UTC
        [param:MaxLength(50)] string? DepartmentCode,
        [param:MaxLength(2000)] string? Notes,
        int? ActualQuantityReceived,
        decimal? MaxPricePerUnit
    );

    public record NeedResponse(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        string Category,
        int RequiredQuantity,
        string UnitOfMeasure,
        DateTime FulfillmentStartDate,
        DateTime FulfillmentEndDate,
        string? DepartmentCode,
        string? Notes,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        int ActualQuantityReceived,
        decimal? MaxPricePerUnit,
        double ProgressPercentage
    );

    public record NeedStatusUpdateRequest(
        [param:Required, MaxLength(50)] string Status
    );
}
