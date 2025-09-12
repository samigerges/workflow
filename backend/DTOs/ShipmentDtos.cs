using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record ShipmentCreateRequest(
        [param:Required, MaxLength(100)] string Reference,
        [param:MaxLength(50)] string? Status,
        decimal? Quantity,
        [param:MaxLength(20)] string? Unit,
        DateTime? LoadDate,
        DateTime? Eta,
        DateTime? Etd,
        DateTime? DeliveryDate,
        [param:Required] Guid VesselId,
        Guid? ContractId,
        Guid? LetterOfCreditId
    );

    public record ShipmentUpdateRequest(
        [param:Required, MaxLength(100)] string Reference,
        [param:MaxLength(50)] string? Status,
        decimal? Quantity,
        [param:MaxLength(20)] string? Unit,
        DateTime? LoadDate,
        DateTime? Eta,
        DateTime? Etd,
        DateTime? DeliveryDate,
        [param:Required] Guid VesselId,
        Guid? ContractId,
        Guid? LetterOfCreditId
    );

    public record ShipmentStatusChangeRequest([param:Required, MaxLength(50)] string Status);

    public record ShipmentResponse(
        Guid Id,
        string Reference,
        string Status,
        decimal? Quantity,
        string? Unit,
        DateTime? LoadDate,
        DateTime? Eta,
        DateTime? Etd,
        DateTime? DeliveryDate,
        Guid VesselId,
        Guid? ContractId,
        Guid? LetterOfCreditId,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ShipmentDocumentResponse(
        Guid Id,
        string? Type,
        string? FileName,
        string? FileUrl,
        DateTime UploadedAt
    );
}
