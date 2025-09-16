using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public class RequestCreateRequest
    {
        [Required, MaxLength(200)]
        public string Title { get; init; } = string.Empty;

        [MaxLength(4000)]
        public string? Description { get; init; }

        public decimal? Quantity { get; init; }

        [MaxLength(50)]
        public string? UnitOfMeasure { get; init; }

        [MaxLength(100)]
        public string? CargoType { get; init; }

        public decimal? PricePerTon { get; init; }

        [MaxLength(200)]
        public string? SupplierName { get; init; }

        [MaxLength(100)]
        public string? CountryOfOrigin { get; init; }

        [MaxLength(100)]
        public string? PaymentMethod { get; init; }

        [MaxLength(100)]
        public string? ShippingMethod { get; init; }

        [MaxLength(4000)]
        public string? LetterOfGuarantee { get; init; }

        public DateTime? StartDate { get; init; }

        public DateTime? EndDate { get; init; }

        [MaxLength(255)]
        public string? UploadedFile { get; init; }

        [MaxLength(50)]
        public string? Status { get; init; }
    }

    public class RequestUpdateRequest
    {
        [MaxLength(200)]
        public string? Title { get; init; }

        [MaxLength(4000)]
        public string? Description { get; init; }

        public decimal? Quantity { get; init; }

        [MaxLength(50)]
        public string? UnitOfMeasure { get; init; }

        [MaxLength(100)]
        public string? CargoType { get; init; }

        public decimal? PricePerTon { get; init; }

        [MaxLength(200)]
        public string? SupplierName { get; init; }

        [MaxLength(100)]
        public string? CountryOfOrigin { get; init; }

        [MaxLength(100)]
        public string? PaymentMethod { get; init; }

        [MaxLength(100)]
        public string? ShippingMethod { get; init; }

        [MaxLength(4000)]
        public string? LetterOfGuarantee { get; init; }

        public DateTime? StartDate { get; init; }

        public DateTime? EndDate { get; init; }

        [MaxLength(255)]
        public string? UploadedFile { get; init; }

        [MaxLength(50)]
        public string? Status { get; init; }
    }

    public record RequestStatusChangeRequest(
        [param:Required, MaxLength(50)] string Status
    );

    /// <summary>
    /// Allows { approve: true/false } OR { value: 1/-1 }.
    /// If both are provided, 'value' wins.
    /// </summary>
    public record RequestVoteRequest(bool? Approve, int? Value);

    public record RequestResponse(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        int VoteScore,
        int? MyVote,
        decimal? Quantity,
        string? UnitOfMeasure,
        string? CargoType,
        decimal? PricePerTon,
        string? SupplierName,
        string? CountryOfOrigin,
        string? PaymentMethod,
        string? ShippingMethod,
        string? LetterOfGuarantee,
        DateTime? StartDate,
        DateTime? EndDate,
        string? UploadedFile
    );
}
