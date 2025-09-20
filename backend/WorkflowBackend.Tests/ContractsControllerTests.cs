using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class ContractsControllerTests
{
    [Fact]
    public async Task CreateJson_PersistsVeryLongNarratives()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);
        var longText = new string('x', Contract.NarrativeMaxLength);
        var reviewText = new string('y', Contract.ReviewNotesMaxLength);

        var request = new ContractCreateRequest(
            Title: "Long contract",
            Description: longText,
            RequestId: null,
            SupplierName: "Supplier",
            Quantity: 100,
            CargoType: "Bulk",
            CountryOfOrigin: "USA",
            PricePerTon: null,
            PaymentMethod: "Wire",
            ShippingMethod: "Sea",
            ContractTerms: longText,
            StartDate: null,
            EndDate: null,
            ReviewNotes: reviewText
        );

        var result = await controller.CreateJson(request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<ContractResponse>(created.Value);
        Assert.Equal(Contract.NarrativeMaxLength, payload.Description?.Length);
        Assert.Equal(Contract.NarrativeMaxLength, payload.ContractTerms?.Length);
        Assert.Equal(Contract.ReviewNotesMaxLength, payload.ReviewNotes?.Length);
    }

    private static ContractsController CreateController(AppDbContext context)
    {
        var controller = new ContractsController(context, new FakeWebHostEnvironment(), NullLogger<ContractsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        return controller;
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
