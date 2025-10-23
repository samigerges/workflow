using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class VesselDischargeUpdate
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid VesselId { get; set; }
        public Vessel? Vessel { get; set; }

        public DateTime DischargeDate { get; set; }

        [Range(0.0, double.MaxValue)]
        public decimal QuantityDischarged { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        [MaxLength(500)]
        public string? ProofDocumentPath { get; set; }

        [MaxLength(255)]
        public string? ProofDocumentFileName { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
