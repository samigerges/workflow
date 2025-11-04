using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class Request
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(50)]
        public string PublicId { get; set; } = string.Empty;

        public int SequenceNumber { get; set; }
            = 0;

        [MaxLength(4000)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "pending";

        public decimal? Quantity { get; set; }

        [MaxLength(50)]
        public string? UnitOfMeasure { get; set; }

        [MaxLength(100)]
        public string? CargoType { get; set; }

        public decimal? PricePerTon { get; set; }

        [MaxLength(200)]
        public string? SupplierName { get; set; }

        public decimal? WheatPercentage { get; set; }

        [MaxLength(100)]
        public string? CountryOfOrigin { get; set; }

        [MaxLength(100)]
        public string? PaymentMethod { get; set; }

        [MaxLength(100)]
        public string? ShippingMethod { get; set; }

        [MaxLength(4000)]
        public string? LetterOfGuarantee { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [MaxLength(255)]
        public string? UploadedFile { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public Guid? NeedId { get; set; }
        public Need? Need { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<RequestVote> Votes { get; set; } = new List<RequestVote>();
    }
}
