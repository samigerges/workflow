using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.Models;
using Xunit;
using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.Extensions.FileProviders;

namespace WorkflowBackend.Tests
{
    public class LettersOfCreditControllerTests
    {
        private class FakeEnv : IWebHostEnvironment
        {
            public string ApplicationName { get; set; } = "Test";
            public IFileProvider WebRootFileProvider { get; set; } = null!;
            public IFileProvider ContentRootFileProvider { get; set; } = null!;
            public string WebRootPath { get; set; } = string.Empty;
            public string ContentRootPath { get; set; } = string.Empty;
            public string EnvironmentName { get; set; } = "Development";
        }

        [Fact]
        public async Task GetVesselsForLc_ReturnsAssociatedVessels()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new AppDbContext(options);

            var lc = new LetterOfCredit { Id = Guid.NewGuid(), Number = "LC1" };
            var v1 = new Vessel { Id = Guid.NewGuid(), Name = "Vessel A", Status = "Planned" };
            var v2 = new Vessel { Id = Guid.NewGuid(), Name = "Vessel B", Status = "Loading" };
            context.LettersOfCredit.Add(lc);
            context.Vessels.AddRange(v1, v2);
            context.VesselLettersOfCredit.AddRange(
                new VesselLetterOfCredit { VesselId = v1.Id, LetterOfCreditId = lc.Id },
                new VesselLetterOfCredit { VesselId = v2.Id, LetterOfCreditId = lc.Id }
            );
            context.SaveChanges();

            var controller = new LettersOfCreditController(context, new FakeEnv());
            var result = await controller.GetVesselsForLc(lc.Id);

            var list = Assert.IsAssignableFrom<IEnumerable<object>>(result.Value);
            var vessels = list.Select(o => new
            {
                VesselId = (Guid)o.GetType().GetProperty("VesselId")!.GetValue(o)!,
                Name = (string)o.GetType().GetProperty("Name")!.GetValue(o)!,
                Status = (string)o.GetType().GetProperty("Status")!.GetValue(o)!
            }).ToList();

            Assert.Equal(2, vessels.Count);
            Assert.Contains(vessels, v => v.VesselId.Equals(v1.Id) && v.Name == v1.Name && v.Status == v1.Status);
            Assert.Contains(vessels, v => v.VesselId.Equals(v2.Id) && v.Name == v2.Name && v.Status == v2.Status);
        }

        [Fact]
        public async Task GetVesselsForLc_ReturnsNotFound_WhenLcMissing()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            using var context = new AppDbContext(options);

            var controller = new LettersOfCreditController(context, new FakeEnv());
            var result = await controller.GetVesselsForLc(Guid.NewGuid());
            Assert.IsType<NotFoundResult>(result.Result);
        }
    }
}
