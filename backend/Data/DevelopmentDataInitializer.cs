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

        var adminEmail = configuration["ADMIN_EMAIL"];
        var adminPassword = configuration["ADMIN_PASSWORD"];

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            return;
        }

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
