using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record DocumentCreateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(100)] string? Type,
        [param:Required, MaxLength(50)] string EntityType,
        [param:Required] Guid EntityId,
        string[]? Tags
    );

    public record DocumentUpdateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(100)] string? Type,
        string[]? Tags
    );

    public record DocumentResponse(
        Guid Id,
        string Title,
        string? Type,
        string EntityType,
        Guid EntityId,
        string? FileName,
        string? FileUrl,
        string[] Tags,
        Guid? UploadedByUserId,
        DateTime UploadedAt
    );
}
