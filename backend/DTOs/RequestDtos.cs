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
    /// Allows legacy { approve: true/false } or { value: 1/-1 } alongside
    /// the newer { vote: "yes"/"no", comment?: "..." } payload used by the UI.
    /// </summary>
    public class RequestVoteRequest
    {
        public bool? Approve { get; init; }

        public int? Value { get; init; }

        [MaxLength(10)]
        public string? Vote { get; init; }

        [MaxLength(2000)]
        public string? Comment { get; init; }
    }

    public record VoteUserResponse(Guid Id, string FirstName, string LastName);

    public record RequestVoteResponse(
        Guid Id,
        Guid RequestId,
        Guid UserId,
        string Vote,
        string? Comment,
        DateTime CreatedAt,
        VoteUserResponse? User
    );

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
