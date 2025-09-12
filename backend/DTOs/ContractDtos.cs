using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record ContractCreateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(4000)] string? Description,
        Guid? RequestId,
        string? SupplierName,
        decimal? Quantity,
        string? CargoType,
        string? CountryOfOrigin,
        decimal? PricePerTon,
        string? PaymentMethod,
        string? ShippingMethod,
        string? ContractTerms,
        DateTime? StartDate,
        DateTime? EndDate,
        string? ReviewNotes
    );

    public record ContractUpdateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(4000)] string? Description,
        Guid? RequestId,
        string? SupplierName,
        decimal? Quantity,
        string? CargoType,
        string? CountryOfOrigin,
        decimal? PricePerTon,
        string? PaymentMethod,
        string? ShippingMethod,
        string? ContractTerms,
        DateTime? StartDate,
        DateTime? EndDate,
        string? ReviewNotes
    );

    public record ContractStatusChangeRequest(
        [param:Required, MaxLength(50)] string Status
    );

    /// <summary>
    /// Allows { approve: true/false } OR { value: 1/-1 }. If both provided, 'value' wins.
    /// </summary>
    public record ContractVoteRequest(bool? Approve, int? Value);

    public record ContractResponse(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        Guid? RequestId,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        int VoteScore,
        int? MyVote,
        string? FileUrl,
        string? FileName,
        string? SupplierName,
        decimal? Quantity,
        string? CargoType,
        string? CountryOfOrigin,
        decimal? PricePerTon,
        string? PaymentMethod,
        string? ShippingMethod,
        string? ContractTerms,
        DateTime? StartDate,
        DateTime? EndDate,
        string? ReviewNotes
    );
}
