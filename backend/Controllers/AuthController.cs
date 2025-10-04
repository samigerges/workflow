using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly PasswordHasher<User> _hasher = new();

        public AuthController(AppDbContext db) => _db = db;

        [HttpPost("register")]
        public async Task<ActionResult<UserResponse>> Register([FromBody] RegisterRequest req)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var exists = await _db.Users.AnyAsync(u => u.Email == email);
            if (exists) return Conflict(new { message = "Email already registered." });

            var user = new User
            {
                Email = email,
                FirstName = req.FirstName.Trim(),
                LastName = req.LastName.Trim(),
                Role = Security.Roles.User
            };
            user.PasswordHash = _hasher.HashPassword(user, req.Password);

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return new UserResponse(user.Id, user.Email, user.FirstName, user.LastName, user.Role ?? Security.Roles.User);
        }

        [HttpPost("login")]
        public async Task<ActionResult<UserResponse>> Login([FromBody] LoginRequest req)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);
            if (user is null) return Unauthorized(new { message = "Invalid credentials." });

            var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
            if (verify == PasswordVerificationResult.Failed) return Unauthorized(new { message = "Invalid credentials." });

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
                new Claim(ClaimTypes.Role, user.Role ?? "User")
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            var cfg = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var expireDays = int.TryParse(cfg["Auth:ExpireDays"], out var d) ? d : 7;

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties
                {
                    IsPersistent = true,
                    ExpiresUtc = DateTimeOffset.UtcNow.AddDays(expireDays)
                });

            return new UserResponse(user.Id, user.Email, user.FirstName, user.LastName, user.Role ?? Security.Roles.User);
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return NoContent();
        }

        [HttpGet("auth/user")]
        public async Task<ActionResult<UserResponse>> Me()
        {
            if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();

            var idStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(idStr, out var id)) return Unauthorized();

            var user = await _db.Users.FindAsync(id);
            if (user is null) return Unauthorized();

            return new UserResponse(user.Id, user.Email, user.FirstName, user.LastName, user.Role ?? Security.Roles.User);
        }
    }
}
