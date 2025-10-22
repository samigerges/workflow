using System.Collections.Generic;
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

        public decimal? Amount { get; set; } // Represents the total LC price

        public decimal? Quantity { get; set; }

        public decimal? PricePerUnit { get; set; }

        [MaxLength(10)]
        public string? Currency { get; set; } // e.g., USD, EUR

        [MaxLength(100)]
        public string? CargoType { get; set; }

        public DateTime? IssueDate { get; set; }
        public DateTime? ShipmentPeriodStart { get; set; }
        public DateTime? ShipmentPeriodEnd { get; set; }
        public DateTime? ExpiryDate { get; set; }

        [MaxLength(200)]
        public string? Applicant { get; set; } // buyer

        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft, Issued, Amended, Utilized, Expired, Cancelled, Archived

        [MaxLength(30)]
        public string Flow { get; set; } = "GASC_TO_UPF"; // GASC_TO_UPF, UPF_TO_SUPPLIER

        // Optional link to Contract
        public Guid? ContractId { get; set; }
        public Contract? Contract { get; set; }

        // Optional file metadata
        [MaxLength(500)]
        public string? FilePath { get; set; } // "uploads/letters-of-credit/xyz.pdf"
        [MaxLength(255)]
        public string? FileName { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<LetterOfCreditSupplierAllocation> SupplierAllocations { get; set; }
            = new List<LetterOfCreditSupplierAllocation>();
    }
}
