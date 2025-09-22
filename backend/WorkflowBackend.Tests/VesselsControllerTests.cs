using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class VesselsControllerTests
{
    private class TestEnv : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Test";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = System.IO.Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Development";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = System.IO.Path.GetTempPath();
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task Nomination_flow_with_basic_fields_succeeds()
    {
        await using var db = CreateDb();
        var controller = new VesselsController(db, new TestEnv());

        var lc = new LetterOfCredit
        {
            Id = Guid.NewGuid(),
            Number = "LC-001",
        };
        db.LettersOfCredit.Add(lc);
        await db.SaveChangesAsync();

        var createReq = new VesselCreateRequest(
            Name: "تنليستنا",
            Status: "nominated",
            Eta: DateTime.Parse("2025-09-18T13:20:00"),
            Etd: null
        );

        var createResult = await controller.CreateJson(createReq);
        var vesselId = ((VesselResponse)((Microsoft.AspNetCore.Mvc.CreatedAtActionResult)createResult.Result!).Value!).Id;

        var linkResult = await controller.LinkLc(vesselId, new VesselLcLinkRequest(lc.Id));
        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(linkResult);

        var portResult = await controller.AddLoadingPort(
            vesselId,
            new LoadingPortCreateRequest("يبشس", "Russia", null, null));
        Assert.NotNull(portResult.Value);
    }
}
