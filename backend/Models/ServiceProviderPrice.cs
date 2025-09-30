using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowBackend.Api.Models
{
    public class ServiceProviderPrice
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ServiceProviderId { get; set; }

        public ServiceProvider? ServiceProvider { get; set; }

        public DateTime QuotedAt { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [Required]
        [MaxLength(10)]
        public string Currency { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Notes { get; set; }
    }
}
