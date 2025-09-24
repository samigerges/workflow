using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record LetterOfCreditCreateRequest(
        [param:Required, MaxLength(100)] string Number,
        [param:MaxLength(200)] string? IssuingBank,
        decimal? Amount,
        decimal? Quantity,
        decimal? PricePerUnit,
        [param:MaxLength(10)] string? Currency,
        DateTime? IssueDate,
        DateTime? ShipmentPeriod,
        DateTime? ExpiryDate,
        [param:MaxLength(200)] string? Applicant,
        [param:MaxLength(200)] string? Beneficiary,
        Guid? ContractId,
        [param:MaxLength(100)] string? CargoType
    );

    public record LetterOfCreditUpdateRequest(
        [param:Required, MaxLength(100)] string Number,
        [param:MaxLength(200)] string? IssuingBank,
        decimal? Amount,
        decimal? Quantity,
        decimal? PricePerUnit,
        [param:MaxLength(10)] string? Currency,
        DateTime? IssueDate,
        DateTime? ShipmentPeriod,
        DateTime? ExpiryDate,
        [param:MaxLength(200)] string? Applicant,
        [param:MaxLength(200)] string? Beneficiary,
        Guid? ContractId,
        [param:MaxLength(100)] string? CargoType
    );

    public record LetterOfCreditStatusChangeRequest([param:Required, MaxLength(50)] string Status);

    public record LetterOfCreditResponse(
        Guid Id,
        string Number,
        string? IssuingBank,
        decimal? Amount,
        decimal? Quantity,
        decimal? PricePerUnit,
        string? Currency,
        DateTime? IssueDate,
        DateTime? ShipmentPeriod,
        DateTime? ExpiryDate,
        string? Applicant,
        string? Beneficiary,
        string Status,
        Guid? ContractId,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        string? FileUrl,
        string? FileName,
        string? CargoType
    );

    public record LetterOfCreditVesselAllocationResponse(
        Guid VesselId,
        Guid LetterOfCreditId,
        decimal? Quantity
    );
}
