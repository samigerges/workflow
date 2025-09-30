using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using ServiceProviderEntity = WorkflowBackend.Api.Models.ServiceProvider;
using ServiceProviderPriceEntity = WorkflowBackend.Api.Models.ServiceProviderPrice;

namespace WorkflowBackend.Api.Controllers;

[ApiController]
[Route("api/service-providers")]
[Authorize]
public class ServiceProvidersController : ControllerBase
{
    private readonly AppDbContext _db;

    public ServiceProvidersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServiceProviderSummaryResponse>>> GetAll([FromQuery] string? type)
    {
        var query = _db.ServiceProviders
            .Include(p => p.Prices)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(type))
        {
            if (!TryNormalizeType(type, out var normalizedType))
            {
                return BadRequest($"Unknown service provider type '{type}'.");
            }

            query = query.Where(p => p.Type == normalizedType);
        }

        var providers = await query
            .OrderBy(p => p.Type)
            .ThenBy(p => p.Name)
            .ToListAsync();

        var response = providers.Select(MapSummary).ToList();
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceProviderDetailResponse>> GetById(Guid id)
    {
        var provider = await _db.ServiceProviders
            .Include(p => p.Prices)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (provider is null)
        {
            return NotFound();
        }

        return Ok(MapDetail(provider));
    }

    [HttpPost]
    public async Task<ActionResult<ServiceProviderDetailResponse>> Create(ServiceProviderCreateRequest request)
    {
        if (!TryNormalizeType(request.Type, out var normalizedType))
        {
            return BadRequest($"Unknown service provider type '{request.Type}'.");
        }

        var provider = new ServiceProviderEntity
        {
            Name = request.Name.Trim(),
            Type = normalizedType,
            ContactName = request.ContactName?.Trim(),
            ContactEmail = request.ContactEmail?.Trim(),
            ContactPhone = request.ContactPhone?.Trim(),
            DefaultCurrency = NormalizeCurrency(request.DefaultCurrency),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.ServiceProviders.Add(provider);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = provider.Id }, MapDetail(provider));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServiceProviderDetailResponse>> Update(Guid id, ServiceProviderUpdateRequest request)
    {
        if (!TryNormalizeType(request.Type, out var normalizedType))
        {
            return BadRequest($"Unknown service provider type '{request.Type}'.");
        }

        var provider = await _db.ServiceProviders.Include(p => p.Prices).FirstOrDefaultAsync(p => p.Id == id);
        if (provider is null)
        {
            return NotFound();
        }

        provider.Name = request.Name.Trim();
        provider.Type = normalizedType;
        provider.ContactName = request.ContactName?.Trim();
        provider.ContactEmail = request.ContactEmail?.Trim();
        provider.ContactPhone = request.ContactPhone?.Trim();
        provider.DefaultCurrency = NormalizeCurrency(request.DefaultCurrency);
        provider.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(MapDetail(provider));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var provider = await _db.ServiceProviders.FindAsync(id);
        if (provider is null)
        {
            return NotFound();
        }

        _db.ServiceProviders.Remove(provider);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id:guid}/prices")]
    public async Task<ActionResult<IEnumerable<ServiceProviderPriceResponse>>> GetPrices(Guid id)
    {
        var providerExists = await _db.ServiceProviders.AnyAsync(p => p.Id == id);
        if (!providerExists)
        {
            return NotFound();
        }

        var prices = await _db.ServiceProviderPrices
            .Where(p => p.ServiceProviderId == id)
            .OrderByDescending(p => p.QuotedAt)
            .ThenByDescending(p => p.Id)
            .AsNoTracking()
            .Select(p => new ServiceProviderPriceResponse(p.Id, p.QuotedAt, p.Price, p.Currency, p.Notes))
            .ToListAsync();

        return Ok(prices);
    }

    [HttpPost("{id:guid}/prices")]
    public async Task<ActionResult<ServiceProviderPriceResponse>> AddPrice(Guid id, ServiceProviderPriceCreateRequest request)
    {
        var provider = await _db.ServiceProviders.Include(p => p.Prices).FirstOrDefaultAsync(p => p.Id == id);
        if (provider is null)
        {
            return NotFound();
        }

        var normalizedCurrency = NormalizeCurrency(request.Currency);
        if (string.IsNullOrEmpty(normalizedCurrency))
        {
            return BadRequest("Currency is required.");
        }

        var price = new ServiceProviderPriceEntity
        {
            ServiceProviderId = id,
            QuotedAt = request.QuotedAt ?? DateTime.UtcNow,
            Price = request.Price,
            Currency = normalizedCurrency,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
        };

        _db.ServiceProviderPrices.Add(price);
        provider.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var response = new ServiceProviderPriceResponse(price.Id, price.QuotedAt, price.Price, price.Currency, price.Notes);
        return CreatedAtAction(nameof(GetPrices), new { id }, response);
    }

    [HttpDelete("{id:guid}/prices/{priceId:guid}")]
    public async Task<IActionResult> DeletePrice(Guid id, Guid priceId)
    {
        var providerExists = await _db.ServiceProviders.AnyAsync(p => p.Id == id);
        if (!providerExists)
        {
            return NotFound();
        }

        var price = await _db.ServiceProviderPrices.FirstOrDefaultAsync(p => p.Id == priceId && p.ServiceProviderId == id);
        if (price is null)
        {
            return NotFound();
        }

        _db.ServiceProviderPrices.Remove(price);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static ServiceProviderSummaryResponse MapSummary(ServiceProviderEntity provider)
    {
        return new ServiceProviderSummaryResponse
        {
            Id = provider.Id,
            Name = provider.Name,
            Type = provider.Type,
            ContactName = provider.ContactName,
            ContactEmail = provider.ContactEmail,
            ContactPhone = provider.ContactPhone,
            DefaultCurrency = provider.DefaultCurrency,
            CreatedAt = provider.CreatedAt,
            UpdatedAt = provider.UpdatedAt,
            PriceSummaries = BuildSummaries(provider.Prices)
        };
    }

    private static ServiceProviderDetailResponse MapDetail(ServiceProviderEntity provider)
    {
        return new ServiceProviderDetailResponse
        {
            Id = provider.Id,
            Name = provider.Name,
            Type = provider.Type,
            ContactName = provider.ContactName,
            ContactEmail = provider.ContactEmail,
            ContactPhone = provider.ContactPhone,
            DefaultCurrency = provider.DefaultCurrency,
            CreatedAt = provider.CreatedAt,
            UpdatedAt = provider.UpdatedAt,
            PriceSummaries = BuildSummaries(provider.Prices),
            Prices = provider.Prices
                .OrderByDescending(p => p.QuotedAt)
                .ThenByDescending(p => p.Id)
                .Select(p => new ServiceProviderPriceResponse(p.Id, p.QuotedAt, p.Price, p.Currency, p.Notes))
                .ToList()
        };
    }

    private static IReadOnlyCollection<ServiceProviderPriceSummaryResponse> BuildSummaries(
        IEnumerable<ServiceProviderPriceEntity> prices)
    {
        return prices
            .GroupBy(p => p.Currency)
            .Select(g =>
            {
                var ordered = g.OrderByDescending(p => p.QuotedAt).ThenByDescending(p => p.Id);
                var latest = ordered.FirstOrDefault();
                var average = g.Average(p => p.Price);
                return new ServiceProviderPriceSummaryResponse(
                    g.Key,
                    latest?.Price,
                    latest?.QuotedAt,
                    average);
            })
            .OrderBy(s => s.Currency)
            .ToList();
    }

    private static bool TryNormalizeType(string? type, out string normalizedType)
    {
        normalizedType = string.Empty;

        if (string.IsNullOrWhiteSpace(type))
        {
            return false;
        }

        normalizedType = NormalizeType(type);
        return ServiceProviderTypes.All.Contains(normalizedType);
    }

    private static string NormalizeType(string type)
    {
        var trimmed = type.Trim();

        if (string.Equals(trimmed, ServiceProviderTypes.Shipping, StringComparison.OrdinalIgnoreCase))
        {
            return ServiceProviderTypes.Shipping;
        }

        if (string.Equals(trimmed, ServiceProviderTypes.Insurance, StringComparison.OrdinalIgnoreCase))
        {
            return ServiceProviderTypes.Insurance;
        }

        if (string.Equals(trimmed, ServiceProviderTypes.Inspection, StringComparison.OrdinalIgnoreCase))
        {
            return ServiceProviderTypes.Inspection;
        }

        return trimmed.ToLowerInvariant();
    }

    private static string? NormalizeCurrency(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return null;
        }

        return currency.Trim().ToUpperInvariant();
    }
}
