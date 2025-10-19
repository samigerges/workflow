using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public class VesselUpsertRequest
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Status { get; set; }

        public DateTime? Eta { get; set; }
        public DateTime? Etd { get; set; }

        public Guid? ContractId { get; set; }
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

        public string? ShippingInstructions { get; set; }

        public DateTime? ArrivalDate { get; set; }
        public DateTime? DischargeStartDate { get; set; }
        public DateTime? DischargeEndDate { get; set; }
        public decimal? ActualQuantity { get; set; }

        public DateTime? CustomsReleaseDate { get; set; }

        [MaxLength(100)]
        public string? CustomsReleaseNumber { get; set; }

        [MaxLength(50)]
        public string? CustomsReleaseStatus { get; set; }
    }

    public class VesselCreateRequest : VesselUpsertRequest
    {
    }

    public class VesselUpdateRequest : VesselUpsertRequest
    {
    }

    public record VesselResponse(
        Guid Id,
        string Name,
        string VesselName,
        string Status,
        DateTime? Eta,
        DateTime? Etd,
        Guid? ContractId,
        decimal? Quantity,
        string? CargoType,
        string? CountryOfOrigin,
        string? PortOfDischarge,
        string? TradeTerms,
        string? InsuranceCompany,
        string? InspectionCompany,
        string? ShippingCompany,
        decimal? InsuranceCost,
        decimal? InspectionCost,
        decimal? ShippingCost,
        string? ShippingInstructions,
        DateTime? ArrivalDate,
        DateTime? DischargeStartDate,
        DateTime? DischargeEndDate,
        decimal? ActualQuantity,
        DateTime? CustomsReleaseDate,
        string? CustomsReleaseNumber,
        string? CustomsReleaseStatus,
        string? InstructionsUrl,
        string? InstructionsFile,
        string? InstructionsFileName,
        string? CustomsReleaseFileUrl,
        string? CustomsReleaseFile,
        string? CustomsReleaseFileName,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record LoadingPortCreateRequest(
        [param:Required, MaxLength(200)] string PortName,
        [param:MaxLength(100)] string? Country,
        double? Latitude,
        double? Longitude
    );

    public record VesselDocumentResponse(
        Guid Id,
        string? Type,
        string? FileName,
        string? FileUrl,
        DateTime UploadedAt
    );

    public record VesselLcLinkRequest(Guid LetterOfCreditId);
}
