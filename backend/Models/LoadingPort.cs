using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class LoadingPort
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid VesselId { get; set; }
        public Vessel? Vessel { get; set; }

        [Required, MaxLength(200)]
        public string PortName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Country { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}
