using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowBackend.Api.Models
{
    public class Contract
    {
        public const int NarrativeMaxLength = 20000;
        public const int ReviewNotesMaxLength = 20000;

        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(50)]
        public string PublicId { get; set; } = string.Empty;

        public int SequenceNumber { get; set; }
            = 0; // incremented sequential identifier shared with requests

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(NarrativeMaxLength)]
        [Column(TypeName = "text")]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft, Active, Completed, Cancelled, Archived

        // Optional link to a Request
        public Guid? RequestId { get; set; }
        public Request? Request { get; set; }

        // File metadata (optional)
        [MaxLength(500)]
        public string? FilePath { get; set; } // relative path under wwwroot, e.g. "uploads/contracts/xyz.pdf"

        [MaxLength(255)]
        public string? FileName { get; set; } // original filename

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ContractVote> Votes { get; set; } = new List<ContractVote>();

        // Extended fields to match frontend payloads
        [MaxLength(200)]
        public string? SupplierName { get; set; }

        public decimal? Quantity { get; set; }

        [MaxLength(100)]
        public string? CargoType { get; set; }

        [MaxLength(100)]
        public string? CountryOfOrigin { get; set; }

        public decimal? PricePerTon { get; set; }

        [MaxLength(100)]
        public string? PaymentMethod { get; set; }

        [MaxLength(100)]
        public string? ShippingMethod { get; set; }

        [MaxLength(NarrativeMaxLength)]
        [Column(TypeName = "text")]
        public string? ContractTerms { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        [MaxLength(ReviewNotesMaxLength)]
        [Column(TypeName = "text")]
        public string? ReviewNotes { get; set; }
    }
}
