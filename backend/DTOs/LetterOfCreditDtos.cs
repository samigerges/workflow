using System.Collections.Generic;
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
        DateTime? ShipmentPeriodStart,
        DateTime? ShipmentPeriodEnd,
        DateTime? ExpiryDate,
        [param:MaxLength(200)] string? Applicant,
        Guid? ContractId,
        [param:MaxLength(100)] string? CargoType,
        [param:MaxLength(30)] string? Flow = null
    );

    public record LetterOfCreditUpdateRequest(
        [param:Required, MaxLength(100)] string Number,
        [param:MaxLength(200)] string? IssuingBank,
        decimal? Amount,
        decimal? Quantity,
        decimal? PricePerUnit,
        [param:MaxLength(10)] string? Currency,
        DateTime? IssueDate,
        DateTime? ShipmentPeriodStart,
        DateTime? ShipmentPeriodEnd,
        DateTime? ExpiryDate,
        [param:MaxLength(200)] string? Applicant,
        Guid? ContractId,
        [param:MaxLength(100)] string? CargoType,
        [param:MaxLength(30)] string? Flow = null
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
        DateTime? ShipmentPeriodStart,
        DateTime? ShipmentPeriodEnd,
        DateTime? ExpiryDate,
        string? Applicant,
        string? SupplierName,
        string Status,
        Guid? ContractId,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        string? FileUrl,
        string? FileName,
        string? CargoType,
        IReadOnlyList<LetterOfCreditSupplierAllocationResponse> SupplierAllocations,
        string Flow
    );

    public record LetterOfCreditVesselAllocationResponse(
        Guid VesselId,
        Guid LetterOfCreditId,
        decimal? Quantity
    );

    public record LetterOfCreditSupplierAllocationRequest(
        Guid? SupplierId,
        [param:Required, MaxLength(200)] string SupplierName,
        decimal? Quantity,
        decimal? Amount,
        [param:MaxLength(200)] string? SupplierReference = null,
        [param:MaxLength(2000)] string? Notes = null
    );

    public record LetterOfCreditSupplierAllocationResponse(
        Guid Id,
        Guid LetterOfCreditId,
        Guid? SupplierId,
        string SupplierName,
        decimal? Quantity,
        decimal? Amount,
        string? SupplierReference,
        Guid? CreatedByUserId,
        string? Notes,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record SupplierAllocationContractOption(
        Guid ContractId,
        string? ContractPublicId,
        int SequenceNumber,
        string SupplierName
    );
}
