using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record VesselCreateRequest(
        [param:Required, MaxLength(200)] string Name,
        [param:MaxLength(50)] string? Status,
        DateTime? Eta,
        DateTime? Etd
    );

    public record VesselUpdateRequest(
        [param:Required, MaxLength(200)] string Name,
        [param:MaxLength(50)] string? Status,
        DateTime? Eta,
        DateTime? Etd
    );

    public record VesselResponse(
        Guid Id,
        string Name,
        string Status,
        DateTime? Eta,
        DateTime? Etd,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        string? InstructionsUrl,
        string? InstructionsFileName
    );

    public record LoadingPortCreateRequest(
        [param:Required, MaxLength(200)] string PortName,
        [param:MaxLength(100)] string? Country,
        double? Latitude,
        double? Longitude
    );

    public record VesselDocumentResponse(
        Guid Id,
        string? Type,
        string? FileName,
        string? FileUrl,
        DateTime UploadedAt
    );

    public record VesselLcLinkRequest(Guid LetterOfCreditId);
}
