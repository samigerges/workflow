using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs;

public record ServiceProviderCreateRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; init; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Type { get; init; } = string.Empty;

    [MaxLength(200)]
    public string? ContactName { get; init; }

    [EmailAddress]
    [MaxLength(200)]
    public string? ContactEmail { get; init; }

    [MaxLength(50)]
    public string? ContactPhone { get; init; }

    [MaxLength(10)]
    public string? DefaultCurrency { get; init; }
}

public record ServiceProviderUpdateRequest : ServiceProviderCreateRequest;

public record ServiceProviderPriceCreateRequest
{
    [Required]
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal Price { get; init; }

    [Required]
    [MaxLength(10)]
    public string Currency { get; init; } = string.Empty;

    public DateTime? QuotedAt { get; init; }

    [MaxLength(2000)]
    public string? Notes { get; init; }
}

public record ServiceProviderPriceResponse
(
    Guid Id,
    DateTime QuotedAt,
    decimal Price,
    string Currency,
    string? Notes
);

public record ServiceProviderPriceSummaryResponse
(
    string Currency,
    decimal? LatestPrice,
    DateTime? LatestQuotedAt,
    decimal AveragePrice
);

public record ServiceProviderSummaryResponse
{
    public Guid Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public string Type { get; init; } = string.Empty;

    public string? ContactName { get; init; }

    public string? ContactEmail { get; init; }

    public string? ContactPhone { get; init; }

    public string? DefaultCurrency { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }
    public IReadOnlyCollection<ServiceProviderPriceSummaryResponse> PriceSummaries { get; init; }
        = Array.Empty<ServiceProviderPriceSummaryResponse>();
}

public record ServiceProviderDetailResponse : ServiceProviderSummaryResponse
{
    public IReadOnlyCollection<ServiceProviderPriceResponse> Prices { get; init; }
        = Array.Empty<ServiceProviderPriceResponse>();
}
