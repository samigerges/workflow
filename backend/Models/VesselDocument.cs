using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class VesselDocument
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid VesselId { get; set; }
        public Vessel? Vessel { get; set; }

        [MaxLength(100)]
        public string? Type { get; set; } // e.g., NOR, B/L, Invoice, COA

        [MaxLength(255)]
        public string? FileName { get; set; } // original
        [MaxLength(500)]
        public string? FilePath { get; set; } // uploads/vessel-documents/xxx.ext

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
