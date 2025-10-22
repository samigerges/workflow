using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class PortSchedule
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid PortId { get; set; }
        public Port? Port { get; set; }

        [Required]
        public Guid VesselId { get; set; }
        public Vessel? Vessel { get; set; }

        public DateTime? Eta { get; set; }
        public DateTime? Etd { get; set; }

        public decimal? Quantity { get; set; }

        [MaxLength(50)]
        public string? Status { get; set; }

        public bool IsForecast { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
