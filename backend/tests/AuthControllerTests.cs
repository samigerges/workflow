using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class AuthControllerTests
{
    private static AppDbContext CreateContext(string name)
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new AppDbContext(opts);
    }

    [Fact]
    public async Task Register_ReturnsConflict_WhenEmailExists()
    {
        using var ctx = CreateContext(nameof(Register_ReturnsConflict_WhenEmailExists));
        ctx.Users.Add(new User { Email = "a@example.com", FirstName = "A", LastName = "B", PasswordHash = "hash" });
        await ctx.SaveChangesAsync();
        var controller = new AuthController(ctx);
        var req = new RegisterRequest { Email = "a@example.com", FirstName = "A", LastName = "B", Password = "pass" };

        var result = await controller.Register(req);

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task Register_CreatesUser_WhenNewEmail()
    {
        using var ctx = CreateContext(nameof(Register_CreatesUser_WhenNewEmail));
        var controller = new AuthController(ctx);
        var req = new RegisterRequest { Email = "new@example.com", FirstName = "New", LastName = "User", Password = "pass" };

        var result = await controller.Register(req);

        var user = await ctx.Users.SingleOrDefaultAsync(u => u.Email == "new@example.com");
        Assert.NotNull(user);
        Assert.IsType<UserResponse>(result.Value);
    }
}
