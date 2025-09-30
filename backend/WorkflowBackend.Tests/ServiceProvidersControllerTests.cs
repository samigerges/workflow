using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class ServiceProvidersControllerTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task Aggregates_price_history_by_currency()
    {
        await using var db = CreateDb();
        var controller = new ServiceProvidersController(db);

        var createRequest = new ServiceProviderCreateRequest
        {
            Name = "Acme Shipping",
            Type = ServiceProviderTypes.Shipping,
            DefaultCurrency = "usd",
            ContactEmail = "ops@acme.test"
        };

        var createResult = await controller.Create(createRequest);
        var created = Assert.IsType<CreatedAtActionResult>(createResult.Result);
        var createdPayload = Assert.IsType<ServiceProviderDetailResponse>(created.Value);
        var providerId = createdPayload.Id;

        await controller.AddPrice(providerId, new ServiceProviderPriceCreateRequest
        {
            Price = 100m,
            Currency = "usd",
            QuotedAt = new DateTime(2024, 01, 01)
        });

        await controller.AddPrice(providerId, new ServiceProviderPriceCreateRequest
        {
            Price = 150m,
            Currency = "USD",
            QuotedAt = new DateTime(2024, 02, 01)
        });

        await controller.AddPrice(providerId, new ServiceProviderPriceCreateRequest
        {
            Price = 200m,
            Currency = "eur",
            QuotedAt = new DateTime(2024, 03, 01)
        });

        await controller.AddPrice(providerId, new ServiceProviderPriceCreateRequest
        {
            Price = 220m,
            Currency = "eur",
            QuotedAt = new DateTime(2024, 03, 15),
            Notes = "Peak season"
        });

        var listResult = await controller.GetAll(null);
        var ok = Assert.IsType<OkObjectResult>(listResult.Result);
        var summaries = Assert.IsAssignableFrom<IReadOnlyCollection<ServiceProviderSummaryResponse>>(ok.Value);
        var summary = Assert.Single(summaries);

        Assert.Equal(ServiceProviderTypes.Shipping, summary.Type);
        Assert.Equal("USD", summary.DefaultCurrency);
        Assert.Equal(2, summary.PriceSummaries.Count);

        var usdSummary = summary.PriceSummaries.Single(s => s.Currency == "USD");
        Assert.Equal(150m, usdSummary.LatestPrice);
        Assert.Equal(new DateTime(2024, 02, 01), usdSummary.LatestQuotedAt);
        Assert.Equal(125m, Math.Round(usdSummary.AveragePrice, 2));

        var eurSummary = summary.PriceSummaries.Single(s => s.Currency == "EUR");
        Assert.Equal(220m, eurSummary.LatestPrice);
        Assert.Equal(new DateTime(2024, 03, 15), eurSummary.LatestQuotedAt);
        Assert.Equal(210m, Math.Round(eurSummary.AveragePrice, 2));

        var detailResult = await controller.GetById(providerId);
        var detailOk = Assert.IsType<OkObjectResult>(detailResult.Result);
        var detail = Assert.IsType<ServiceProviderDetailResponse>(detailOk.Value);

        Assert.Equal(4, detail.Prices.Count);
        Assert.Equal(new DateTime(2024, 03, 15), detail.Prices.First().QuotedAt);
        Assert.Equal("EUR", detail.Prices.First().Currency);
        Assert.Equal("Peak season", detail.Prices.First().Notes);

        var filtered = await controller.GetAll(ServiceProviderTypes.Shipping);
        Assert.IsType<OkObjectResult>(filtered.Result);

        var badType = await controller.GetAll("unknown");
        Assert.IsType<BadRequestObjectResult>(badType.Result);
    }
}
