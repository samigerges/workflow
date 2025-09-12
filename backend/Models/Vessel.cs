using System.ComponentModel.DataAnnotations;

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

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public ICollection<LoadingPort> LoadingPorts { get; set; } = new List<LoadingPort>();
        public ICollection<VesselDocument> Documents { get; set; } = new List<VesselDocument>();
        public ICollection<VesselLetterOfCredit> LettersOfCredit { get; set; } = new List<VesselLetterOfCredit>();

        public string? InstructionsPath { get; set; } // uploads/vessels/xxx.pdf
        public string? InstructionsFileName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
