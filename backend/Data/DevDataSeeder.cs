using Microsoft.AspNetCore.Identity;
using WorkflowBackend.Api.Models;
using WorkflowBackend.Api.Security;

namespace WorkflowBackend.Api.Data;

public static class DevDataSeeder
{
    public static void SeedAdminUser(AppDbContext db)
    {
        db.Database.EnsureCreated();

        if (db.Users.Any())
        {
            return;
        }

        var admin = new User
        {
            Email = "samy@gmail.com",
            FirstName = "Samy",
            LastName = "Gerges",
            Role = Roles.Admin
        };

        var hasher = new PasswordHasher<User>();
        admin.PasswordHash = hasher.HashPassword(admin, "admin123");
        db.Users.Add(admin);
        db.SaveChanges();
    }
}
