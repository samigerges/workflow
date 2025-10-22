using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class Port
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Code { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }

        [MaxLength(100)]
        public string? Region { get; set; }

        public int? MaxConcurrentVessels { get; set; }

        public decimal? StorageCapacity { get; set; }

        public decimal? DailyThroughputCapacity { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<PortSchedule> Schedules { get; set; } = new List<PortSchedule>();
    }
}
