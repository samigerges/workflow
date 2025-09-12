namespace WorkflowBackend.Api.Models
{
    public class VesselLetterOfCredit
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid VesselId { get; set; }
        public Vessel? Vessel { get; set; }

        public Guid LetterOfCreditId { get; set; }
        public LetterOfCredit? LetterOfCredit { get; set; }
    }
}
