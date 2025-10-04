using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WorkflowBackend.Api.Models;
using WorkflowBackend.Api.Security;

namespace WorkflowBackend.Api.Data;

public static class DevelopmentDataInitializer
{
    public static async Task SeedAdminUserAsync(IServiceProvider services, IConfiguration configuration)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var adminEmail = configuration["ADMIN_EMAIL"]
                          ?? configuration["Auth:DefaultAdmin:Email"]
                          ?? "admin@example.com";
        var adminPassword = configuration["ADMIN_PASSWORD"]
                             ?? configuration["Auth:DefaultAdmin:Password"]
                             ?? "ChangeMe123!";

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            return;
        }

        adminEmail = adminEmail.Trim().ToLowerInvariant();

        if (!await db.Users.AnyAsync())
        {
            var admin = new User
            {
                Email = adminEmail,
                FirstName = "Admin",
                LastName = "User",
                Role = Roles.Admin
            };
            var hasher = new PasswordHasher<User>();
            admin.PasswordHash = hasher.HashPassword(admin, adminPassword);
            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }
    }
}
