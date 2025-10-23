using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public class VesselDischargeUpdateRequest
    {
        [Required]
        public Guid VesselId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
        public decimal QuantityDischarged { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }
    }
}
