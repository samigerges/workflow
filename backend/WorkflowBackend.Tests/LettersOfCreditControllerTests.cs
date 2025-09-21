using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class LettersOfCreditControllerTests
{
    [Fact]
    public async Task CreateJson_ReturnsBadRequest_WhenContractDoesNotExist()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);
        var controller = CreateController(context);

        var request = new LetterOfCreditCreateRequest(
            Number: "LC-001",
            IssuingBank: null,
            Amount: null,
            Currency: null,
            IssueDate: null,
            ExpiryDate: null,
            Applicant: null,
            Beneficiary: null,
            ContractId: Guid.NewGuid());

        var result = await controller.CreateJson(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var payload = badRequest.Value;
        var message = payload?.GetType().GetProperty("message")?.GetValue(payload) as string;

        Assert.Equal("The specified contract does not exist.", message);
    }

    [Fact]
    public async Task UpdateJson_ReturnsBadRequest_WhenContractDoesNotExist()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AppDbContext(options);
        var lc = new LetterOfCredit
        {
            Number = "LC-Existing",
            Status = "Draft"
        };
        context.LettersOfCredit.Add(lc);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var update = new LetterOfCreditUpdateRequest(
            Number: "LC-Existing",
            IssuingBank: null,
            Amount: null,
            Currency: null,
            IssueDate: null,
            ExpiryDate: null,
            Applicant: null,
            Beneficiary: null,
            ContractId: Guid.NewGuid());

        var result = await controller.UpdateJson(lc.Id, update);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var payload = badRequest.Value;
        var message = payload?.GetType().GetProperty("message")?.GetValue(payload) as string;

        Assert.Equal("The specified contract does not exist.", message);
    }

    private static LettersOfCreditController CreateController(AppDbContext context)
    {
        var controller = new LettersOfCreditController(context, new StubWebHostEnvironment())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var request = controller.ControllerContext.HttpContext.Request;
        request.Scheme = "https";
        request.Host = new HostString("test.local");

        return controller;
    }

    private sealed class StubWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "WorkflowBackend.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
