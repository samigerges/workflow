using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record NeedCreateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(2000)] string? Description
    );

    public record NeedUpdateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(2000)] string? Description,
        [param:MaxLength(50)] string Status
    );

    public record NeedResponse(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );
}
