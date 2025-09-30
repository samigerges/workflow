using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public static class ServiceProviderTypes
    {
        public const string Shipping = "shipping";
        public const string Insurance = "insurance";
        public const string Inspection = "inspection";

        public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
        {
            Shipping,
            Insurance,
            Inspection
        };
    }

    public class ServiceProvider
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? ContactName { get; set; }

        [MaxLength(200)]
        public string? ContactEmail { get; set; }

        [MaxLength(50)]
        public string? ContactPhone { get; set; }

        [MaxLength(10)]
        public string? DefaultCurrency { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ServiceProviderPrice> Prices { get; set; } = new List<ServiceProviderPrice>();
    }
}
