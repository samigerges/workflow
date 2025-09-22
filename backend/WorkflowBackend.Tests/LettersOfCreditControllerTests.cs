using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class LettersOfCreditControllerTests
{
    [Fact]
    public async Task CreateJson_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var issueDate = new DateTime(2024, 10, 5, 0, 0, 0, DateTimeKind.Unspecified);
        var expiryDate = new DateTime(2025, 2, 15);

        var request = new LetterOfCreditCreateRequest(
            Number: "LC-001",
            IssuingBank: "Test Bank",
            Amount: 10_000m,
            Currency: "usd",
            IssueDate: issueDate,
            ExpiryDate: expiryDate,
            Applicant: "Applicant",
            Beneficiary: "Beneficiary",
            ContractId: null);

        var result = await controller.CreateJson(request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<LetterOfCreditResponse>(created.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);

        var saved = await context.LettersOfCredit.SingleAsync();
        Assert.Equal(DateTimeKind.Utc, saved.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.ExpiryDate?.Kind);
    }

    [Fact]
    public async Task CreateForm_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var issueDate = new DateTime(2023, 3, 10);
        var expiryDate = new DateTime(2023, 9, 25);

        var result = await controller.CreateForm(
            number: "LC-002",
            issuingBank: "Another Bank",
            amount: 5_000m,
            currency: "eur",
            issueDate: issueDate,
            expiryDate: expiryDate,
            applicant: null,
            beneficiary: null,
            contractId: null,
            file: null);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<LetterOfCreditResponse>(created.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);

        var saved = await context.LettersOfCredit.SingleAsync();
        Assert.Equal(DateTimeKind.Utc, saved.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.ExpiryDate?.Kind);
    }

    [Fact]
    public async Task UpdateJson_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var lc = new LetterOfCredit { Number = "LC-Existing" };
        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var issueDate = new DateTime(2026, 1, 1);
        var expiryDate = new DateTime(2026, 12, 31);

        var request = new LetterOfCreditUpdateRequest(
            Number: "LC-Existing",
            IssuingBank: null,
            Amount: null,
            Currency: "gbp",
            IssueDate: issueDate,
            ExpiryDate: expiryDate,
            Applicant: null,
            Beneficiary: null,
            ContractId: null);

        var result = await controller.UpdateJson(lc.Id, request);

        var payload = Assert.IsType<LetterOfCreditResponse>(result.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);

        Assert.Equal(DateTimeKind.Utc, lc.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, lc.ExpiryDate?.Kind);
    }

    [Fact]
    public async Task UpdateForm_NormalizesDatesToUtc()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var lc = new LetterOfCredit { Number = "LC-Form" };
        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var issueDate = new DateTime(2027, 4, 5);
        var expiryDate = new DateTime(2027, 8, 20);

        var result = await controller.UpdateForm(
            id: lc.Id,
            number: "LC-Form",
            issuingBank: null,
            amount: null,
            currency: "usd",
            issueDate: issueDate,
            expiryDate: expiryDate,
            applicant: null,
            beneficiary: null,
            contractId: null,
            file: null);

        var payload = Assert.IsType<LetterOfCreditResponse>(result.Value);

        Assert.Equal(DateTimeKind.Utc, payload.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, payload.ExpiryDate?.Kind);

        Assert.Equal(DateTimeKind.Utc, lc.IssueDate?.Kind);
        Assert.Equal(DateTimeKind.Utc, lc.ExpiryDate?.Kind);
    }

    [Fact]
    public async Task GetVesselsForLc_ReturnsLinkedVesselsWithQuantities()
    {
        var options = CreateInMemoryOptions();

        await using var context = new AppDbContext(options);

        var lc = new LetterOfCredit { Number = "LC-Link" };
        var vessel = new Vessel { Name = "MV Test", Quantity = 125m };

        context.LettersOfCredit.Add(lc);
        context.Vessels.Add(vessel);
        await context.SaveChangesAsync();

        context.VesselLettersOfCredit.Add(new VesselLetterOfCredit
        {
            VesselId = vessel.Id,
            LetterOfCreditId = lc.Id
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var result = await controller.GetVesselsForLc(lc.Id);

        var allocations = Assert.IsAssignableFrom<IEnumerable<LetterOfCreditVesselAllocationResponse>>(result.Value);
        var allocation = Assert.Single(allocations);

        Assert.Equal(vessel.Id, allocation.VesselId);
        Assert.Equal(lc.Id, allocation.LetterOfCreditId);
        Assert.Equal(vessel.Quantity, allocation.Quantity);
    }

    private static DbContextOptions<AppDbContext> CreateInMemoryOptions() =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

    private static LettersOfCreditController CreateController(AppDbContext context, IWebHostEnvironment? environment = null)
    {
        var controller = new LettersOfCreditController(context, environment ?? new FakeWebHostEnvironment());

        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) },
            authenticationType: "Test");

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity)
        };

        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("example.test");

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public FakeWebHostEnvironment()
        {
            var root = Path.GetTempPath();
            WebRootPath = root;
            ContentRootPath = root;
        }

        public string ApplicationName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; }
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
