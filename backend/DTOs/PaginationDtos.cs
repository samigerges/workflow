using System;
using System.Collections.Generic;

namespace WorkflowBackend.Api.DTOs
{
    public record PaginatedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

    public record AvailableLetterOfCreditSummary(
        Guid Id,
        string LcNumber,
        string? Supplier,
        string? Product,
        decimal TotalQuantity,
        decimal UsedQuantity,
        decimal RemainingQuantity,
        DateTime? ExpiryDate
    );
}
