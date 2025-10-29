using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record ReportsExportRequest(
        string? SelectedSupplier,
        string? SelectedSupplierLabel,
        string? SelectedCountry,
        ReportsExportDateRange? DateRange
    );

    public record ReportsExportDateRange(
        [property: DataType(DataType.Date)] string? From,
        [property: DataType(DataType.Date)] string? To
    );
}
