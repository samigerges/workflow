using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class LetterOfCreditSupplierAllocation
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid LetterOfCreditId { get; set; }
        public LetterOfCredit? LetterOfCredit { get; set; }

        public Guid? SupplierId { get; set; }

        [Required, MaxLength(200)]
        public string SupplierName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? SupplierReference { get; set; }

        public decimal? Quantity { get; set; }

        public decimal? Amount { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
