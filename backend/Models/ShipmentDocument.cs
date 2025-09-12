using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class ShipmentDocument
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ShipmentId { get; set; }
        public Shipment? Shipment { get; set; }

        [MaxLength(100)]
        public string? Type { get; set; } // B/L, Invoice, Packing List, COO, etc.

        [MaxLength(255)]
        public string? FileName { get; set; }

        [MaxLength(500)]
        public string? FilePath { get; set; } // uploads/shipment-documents/xxx

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
