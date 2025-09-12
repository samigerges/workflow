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
    private static AppDbContext CreateContext(string name)
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new AppDbContext(opts);
    }

    private static IWebHostEnvironment FakeEnv() => new TestEnv();

    [Fact]
    public async Task ChangeStatus_ReturnsBadRequest_ForInvalidTransition()
    {
        using var ctx = CreateContext(nameof(ChangeStatus_ReturnsBadRequest_ForInvalidTransition));
        var lc = new LetterOfCredit { Id = Guid.NewGuid(), Number = "LC1", Status = "Draft" };
        ctx.LettersOfCredit.Add(lc);
        await ctx.SaveChangesAsync();

        var controller = new LettersOfCreditController(ctx, FakeEnv())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        var result = await controller.ChangeStatus(lc.Id, new LetterOfCreditStatusChangeRequest { Status = "Amended" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    private class TestEnv : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Tests";
        public string WebRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider WebRootFileProvider { get; set; } = new PhysicalFileProvider(Path.GetTempPath());
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(Path.GetTempPath());
    }
}
