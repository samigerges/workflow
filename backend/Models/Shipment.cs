using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class Shipment
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(100)]
        public string Reference { get; set; } = string.Empty; // internal or forwarder ref

        [MaxLength(50)]
        public string Status { get; set; } = "Planned"; // Planned, Booked, Loading, InTransit, Arrived, Delivered, Cancelled, Archived

        // Quantities
        public decimal? Quantity { get; set; }
        [MaxLength(20)]
        public string? Unit { get; set; } // MT, KG, TEU, etc.

        // Dates
        public DateTime? LoadDate { get; set; }
        public DateTime? Eta { get; set; }
        public DateTime? Etd { get; set; }
        public DateTime? DeliveryDate { get; set; }

        // Links
        [Required]
        public Guid VesselId { get; set; }
        public Vessel? Vessel { get; set; }

        public Guid? ContractId { get; set; }
        public Contract? Contract { get; set; }

        public Guid? LetterOfCreditId { get; set; }
        public LetterOfCredit? LetterOfCredit { get; set; }

        public ICollection<ShipmentDocument> Documents { get; set; } = new List<ShipmentDocument>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
