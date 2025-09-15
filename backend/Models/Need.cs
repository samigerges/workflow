using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowBackend.Api.Models
{
    public class Need
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "draft";

        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        public int RequiredQuantity { get; set; }

        [MaxLength(50)]
        public string UnitOfMeasure { get; set; } = string.Empty;

        public int ActualQuantityReceived { get; set; } = 0;

        public decimal? MaxPricePerUnit { get; set; }

        [NotMapped]
        public double ProgressPercentage => RequiredQuantity == 0 ? 0 : (double)ActualQuantityReceived / RequiredQuantity * 100;

        public DateTime FulfillmentStartDate { get; set; }
        public DateTime FulfillmentEndDate { get; set; }

        [MaxLength(50)]
        public string? DepartmentCode { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
