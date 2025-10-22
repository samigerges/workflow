using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Data;
using WorkflowBackend.Api.Security;
using WorkflowBackend.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

static bool RequestCameOverHttps(HttpContext context)
{
    if (context.Request.IsHttps)
    {
        return true;
    }

    if (context.Request.Headers.TryGetValue("X-Forwarded-Proto", out var protoValues))
    {
        foreach (var value in protoValues)
        {
            if (string.Equals(value, "https", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
    }

    return false;
}

// Add services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection") ??
        "Host=localhost;Port=5432;Database=workflow;Username=workflow;Password=workflow"));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = builder.Configuration["Auth:CookieName"] ?? "workflow_auth";
        options.Cookie.HttpOnly = true;

        // Configure defaults that work for both local HTTP development (where the
        // frontend and backend often run on different ports) and production HTTPS
        // deployments. We start with an "unspecified" SameSite mode so we can
        // choose the appropriate value for each request inside the cookie events
        // below. This avoids Chrome rejecting the cookie (SameSite=None requires
        // Secure) while still allowing cross-origin requests once HTTPS is in
        // place.
        options.Cookie.SameSite = SameSiteMode.Unspecified;
        options.Cookie.SecurePolicy = CookieSecurePolicy.None;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(int.TryParse(builder.Configuration["Auth:ExpireDays"], out var d) ? d : 7);

        options.Events = new CookieAuthenticationEvents
        {
            // Ensure the cookie uses SameSite=None+Secure when the original
            // request was served via HTTPS (including behind a proxy) so that it
            // can flow to the API from a different origin. For plain HTTP
            // development we fall back to Lax so the cookie is still accepted by
            // modern browsers.
            OnSigningIn = ctx =>
            {
                var isHttps = RequestCameOverHttps(ctx.HttpContext);
                ctx.CookieOptions.SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax;
                ctx.CookieOptions.Secure = isHttps;
                return Task.CompletedTask;
            },
            OnSigningOut = ctx =>
            {
                var isHttps = RequestCameOverHttps(ctx.HttpContext);
                ctx.CookieOptions.SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax;
                ctx.CookieOptions.Secure = isHttps;
                return Task.CompletedTask;
            },
            OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; },
            OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; }
        };
    });

// ➕ Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole(Roles.Admin));
    options.AddPolicy("ManagerOrAdmin", p => p.RequireRole(Roles.Admin, Roles.Manager));
    options.AddPolicy("Reports.Read", p => p.RequireRole(Roles.Admin, Roles.Manager));
    // no policy needed for read-only; [Authorize] is enough
});

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ??
                     new[] { "http://localhost:5173", "http://localhost:5000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Honour proxy headers so authentication cookies know when the original
// request was sent over HTTPS. Without this the cookie middleware may drop
// the Secure flag when running behind a reverse proxy, causing browsers to
// reject the cookie and leading to 401 responses on subsequent API calls.
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

// Ensure web root + upload folders exist
var webRoot = app.Environment.WebRootPath;
if (string.IsNullOrWhiteSpace(webRoot))
{
    webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
    Directory.CreateDirectory(webRoot);
}
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "contracts"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "letters-of-credit"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "vessels"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "vessel-documents"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "shipments"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "shipment-documents"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "global-documents"));

// Apply migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await SchemaUpgrader.EnsureRequestAndContractIdentifiersAsync(db);
}

// Seed dev data + Swagger
if (app.Environment.IsDevelopment())
{
    await DevelopmentDataInitializer.SeedAdminUserAsync(app.Services, app.Configuration);
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
