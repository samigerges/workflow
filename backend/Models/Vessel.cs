using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowBackend.Api.Models
{
    public class Vessel
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Status { get; set; } = "Planned"; // Planned, Nominated, Loading, Sailing, Arrived, Discharged, Closed

        public DateTime? Eta { get; set; } // estimated time of arrival
        public DateTime? Etd { get; set; } // estimated time of departure

        public Guid? ContractId { get; set; }
        public Contract? Contract { get; set; }

        public decimal? Quantity { get; set; }

        [MaxLength(100)]
        public string? CargoType { get; set; }

        [MaxLength(100)]
        public string? CountryOfOrigin { get; set; }

        [MaxLength(100)]
        public string? PortOfDischarge { get; set; }

        [MaxLength(50)]
        public string? TradeTerms { get; set; }

        [MaxLength(200)]
        public string? InsuranceCompany { get; set; }

        [MaxLength(200)]
        public string? InspectionCompany { get; set; }

        [MaxLength(200)]
        public string? ShippingCompany { get; set; }

        public decimal? InsuranceCost { get; set; }
        public decimal? InspectionCost { get; set; }
        public decimal? ShippingCost { get; set; }

        [Column(TypeName = "text")]
        public string? ShippingInstructions { get; set; }

        public DateTime? ArrivalDate { get; set; }
        public DateTime? DischargeStartDate { get; set; }
        public DateTime? DischargeEndDate { get; set; }
        public decimal DischargedQuantity { get; set; } = 0m;
        public decimal? ActualQuantity { get; set; }

        public DateTime? CustomsReleaseDate { get; set; }

        [MaxLength(100)]
        public string? CustomsReleaseNumber { get; set; }

        [MaxLength(50)]
        public string? CustomsReleaseStatus { get; set; }

        public string? CustomsReleaseFilePath { get; set; }
        public string? CustomsReleaseFileName { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public ICollection<LoadingPort> LoadingPorts { get; set; } = new List<LoadingPort>();
        public ICollection<VesselDocument> Documents { get; set; } = new List<VesselDocument>();
        public ICollection<VesselLetterOfCredit> LettersOfCredit { get; set; } = new List<VesselLetterOfCredit>();
        public ICollection<VesselStageEntry> StageEntries { get; set; } = new List<VesselStageEntry>();
        public ICollection<VesselDischargeUpdate> DischargeUpdates { get; set; } = new List<VesselDischargeUpdate>();

        public string? InstructionsPath { get; set; } // uploads/vessels/xxx.pdf
        public string? InstructionsFileName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
