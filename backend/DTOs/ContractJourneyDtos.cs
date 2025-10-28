namespace WorkflowBackend.Api.DTOs
{
    public record ContractJourneyReportDto(
        ContractJourneyContractDto Contract,
        ContractJourneyLetterOfCreditDto? LetterOfCredit,
        IReadOnlyList<ContractJourneyVesselDto> Vessels,
        IReadOnlyList<ContractJourneyMilestoneDto> Milestones,
        ContractJourneyDurationsDto Durations
    );

    public record ContractJourneyContractDto(
        Guid Id,
        string ContractNo,
        string? SupplierName,
        decimal? Amount,
        string? Currency,
        DateTime CreatedAt,
        string Status
    );

    public record ContractJourneyLetterOfCreditDto(
        Guid LcId,
        string LcNumber,
        string? BankName,
        DateTime? OpenedAt,
        string? Currency,
        decimal? AllocatedAmount,
        decimal? Balance
    );

    public record ContractJourneyVesselDto(
        Guid VesselId,
        string VesselName,
        string? Port,
        DateTime? Eta,
        DateTime? Etd,
        decimal? ContractualQuantity,
        int ShipmentCount,
        int RequiredDocsCount,
        int SubmittedDocsCount
    );

    public record ContractJourneyMilestoneDto(
        string Name,
        DateTime At,
        string? By
    );

    public record ContractJourneyDurationsDto(
        int? DaysContractToLc,
        int? DaysLcToFirstVessel,
        int? DaysContractToLastVessel
    );
}
