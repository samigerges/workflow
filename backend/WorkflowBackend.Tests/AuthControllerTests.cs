using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WorkflowBackend.Api.Controllers;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using Xunit;

namespace WorkflowBackend.Tests;

public class AuthControllerTests
{
    private static AuthController CreateController(AppDbContext db)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string> { { "Auth:ExpireDays", "7" } })
            .Build());
        services.AddSingleton<IAuthenticationService, FakeAuthService>();
        var provider = services.BuildServiceProvider();

        var controller = new AuthController(db)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new DefaultHttpContext { RequestServices = provider }
            }
        };

        return controller;
    }

    [Fact]
    public async Task RegisterAndLoginRoundtrip()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("auth_db")
            .Options;
        using var db = new AppDbContext(options);
        var controller = CreateController(db);

        var reg = await controller.Register(new RegisterRequest
        {
            Email = "user@example.com",
            Password = "secret",
            FirstName = "Test",
            LastName = "User"
        });

        Assert.NotNull(reg.Value);
        Assert.Equal("user@example.com", reg.Value!.Email);

        var login = await controller.Login(new LoginRequest
        {
            Email = "user@example.com",
            Password = "secret"
        });

        Assert.NotNull(login.Value);
        Assert.Equal("user@example.com", login.Value!.Email);
    }

    private class FakeAuthService : IAuthenticationService
    {
        public Task<AuthenticateResult> AuthenticateAsync(HttpContext context, string scheme)
            => Task.FromResult(AuthenticateResult.NoResult());
        public Task ChallengeAsync(HttpContext context, string scheme, AuthenticationProperties properties)
            => Task.CompletedTask;
        public Task ForbidAsync(HttpContext context, string scheme, AuthenticationProperties properties)
            => Task.CompletedTask;
        public Task SignInAsync(HttpContext context, string scheme, ClaimsPrincipal principal, AuthenticationProperties properties)
            => Task.CompletedTask;
        public Task SignOutAsync(HttpContext context, string scheme, AuthenticationProperties properties)
            => Task.CompletedTask;
    }
}
