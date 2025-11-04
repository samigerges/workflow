using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class Need
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "draft";

        [MaxLength(100)]
        public string Category { get; set; } = "other";

        public decimal RequiredQuantity { get; set; } = 0m;

        [MaxLength(50)]
        public string UnitOfMeasure { get; set; } = string.Empty;

        public DateTime FulfillmentStartDate { get; set; } = DateTime.UtcNow;

        public DateTime FulfillmentEndDate { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string? DepartmentCode { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public decimal? MaxPricePerUnit { get; set; }

        public int ActualQuantityReceived { get; set; } = 0;

        public Guid? CreatedByUserId { get; set; }

        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Request> Requests { get; set; } = new List<Request>();
    }
}
