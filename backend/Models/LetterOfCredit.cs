using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class LetterOfCredit
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(100)]
        public string Number { get; set; } = string.Empty; // LC number/reference

        [MaxLength(200)]
        public string? IssuingBank { get; set; }

        public decimal? Amount { get; set; }

        [MaxLength(10)]
        public string? Currency { get; set; } // e.g., USD, EUR

        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }

        [MaxLength(200)]
        public string? Applicant { get; set; } // buyer

        [MaxLength(200)]
        public string? Beneficiary { get; set; } // seller

        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft, Issued, Amended, Utilized, Expired, Cancelled, Archived

        // Optional link to Contract
        public Guid? ContractId { get; set; }
        public Contract? Contract { get; set; }

        public ICollection<VesselLetterOfCredit> Vessels { get; set; } = new List<VesselLetterOfCredit>();

        // Optional file metadata
        [MaxLength(500)]
        public string? FilePath { get; set; } // "uploads/letters-of-credit/xyz.pdf"
        [MaxLength(255)]
        public string? FileName { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
