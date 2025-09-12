using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    /// <summary>
    /// Global document linked to any entity via (EntityType, EntityId).
    /// EntityType values you’ll likely use: "Contract", "LetterOfCredit", "Vessel", "Shipment", "Request", "Need".
    /// </summary>
    public class Document
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Type { get; set; } // e.g., "Invoice", "B/L", "COO", "Spec", "Image", etc.

        [Required, MaxLength(50)]
        public string EntityType { get; set; } = string.Empty;

        [Required]
        public Guid EntityId { get; set; }

        [MaxLength(255)]
        public string? FileName { get; set; }

        [MaxLength(500)]
        public string? FilePath { get; set; } // uploads/global-documents/xxx.ext

        // Store tags as CSV for simplicity; frontend can split/join
        [MaxLength(1000)]
        public string? TagsCsv { get; set; }

        public Guid? UploadedByUserId { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
