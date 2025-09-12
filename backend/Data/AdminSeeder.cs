using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WorkflowBackend.Api.Models;
using WorkflowBackend.Api.Security;

namespace WorkflowBackend.Api.Data;

/// <summary>
/// Hosted service that seeds an administrator account if no users exist.
/// Reads credentials from configuration (e.g., environment variables).
/// </summary>
public class AdminSeeder : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _configuration;

    public AdminSeeder(IServiceProvider services, IConfiguration configuration)
    {
        _services = services;
        _configuration = configuration;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync(cancellationToken);

        if (await db.Users.AnyAsync(cancellationToken))
        {
            return; // Users already exist; no seeding required
        }

        var email = _configuration["Admin:Email"];
        var password = _configuration["Admin:Password"];
        var firstName = _configuration["Admin:FirstName"] ?? "Admin";
        var lastName = _configuration["Admin:LastName"] ?? "User";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return; // Missing credentials; skip seeding for safety
        }

        var admin = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Role = Roles.Admin
        };
        var hasher = new PasswordHasher<User>();
        admin.PasswordHash = hasher.HashPassword(admin, password);

        db.Users.Add(admin);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
