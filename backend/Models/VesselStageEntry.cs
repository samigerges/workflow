using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class VesselStageEntry
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid VesselId { get; set; }
        public Vessel? Vessel { get; set; }

        [Required, MaxLength(100)]
        public string StageId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? NumberValue { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
