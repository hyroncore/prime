using System.IO;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Prime.Api.Authorization;
using Prime.Api.Data;
using Prime.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Disable config file watching to avoid inotify limits on Render free tier
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>(optional: true, reloadOnChange: false);
}

string connectionString = BuildConnectionString(builder.Configuration);

builder.Services.AddDbContext<PrimeDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddHealthChecks();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Requisition policies
    options.AddPolicy("req:create", policy => policy.Requirements.Add(new PermissionRequirement("req:create")));
    options.AddPolicy("req:edit", policy => policy.Requirements.Add(new PermissionRequirement("req:edit")));
    options.AddPolicy("req:delete", policy => policy.Requirements.Add(new PermissionRequirement("req:delete")));
    options.AddPolicy("req:submit_review", policy => policy.Requirements.Add(new PermissionRequirement("req:submit_review")));
    options.AddPolicy("req:review_action", policy => policy.Requirements.Add(new PermissionRequirement("req:review_action")));
    options.AddPolicy("req:request_submit", policy => policy.Requirements.Add(new PermissionRequirement("req:request_submit")));
    options.AddPolicy("req:approve_internal", policy => policy.Requirements.Add(new PermissionRequirement("req:approve_internal")));
    options.AddPolicy("req:request_revision", policy => policy.Requirements.Add(new PermissionRequirement("req:request_revision")));
    options.AddPolicy("req:mark_outcome", policy => policy.Requirements.Add(new PermissionRequirement("req:mark_outcome")));

    options.AddPolicy("admin:manage_system", policy => policy.Requirements.Add(new PermissionRequirement("admin:manage_system")));

    // Role-based policies (fallback)
    options.AddPolicy("RequireManager", policy => policy.RequireRole("Manager", "Admin"));
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole("Admin"));
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddHttpContextAccessor();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<LoginThrottle>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddHostedService<ArchivalService>();
builder.Services.AddHostedService<NotificationScheduler>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PrimeDbContext>();
    db.Database.Migrate();
    DbSeeder.Seed(db);
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

// Cache-Control: no-store for auth-sensitive pages (prevents caching on shared devices)
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
    var isAuthRoute = path.StartsWith("/login") || path.StartsWith("/account") || path.StartsWith("/api/auth");
    if (isAuthRoute)
    {
        context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
        context.Response.Headers["Pragma"] = "no-cache";
        context.Response.Headers["Expires"] = "0";
    }
    await next();
});

app.MapControllers().RequireAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapFallbackToFile("index.html");

app.MapHealthChecks("/api/health");

app.Run();

static string BuildConnectionString(IConfiguration config)
{
    var databaseUrl = config["DATABASE_URL"]
        ?? config["POSTGRES_URL"]
        ?? config["POSTGRESQL_URL"]
        ?? config["PGDATABASE_URL"]
        ?? config.GetConnectionString("PrimeDb");

    if (string.IsNullOrEmpty(databaseUrl))
    {
        throw new InvalidOperationException("No database connection string found. Set DATABASE_URL environment variable or ConnectionStrings:PrimeDb in appsettings.json");
    }

    // If it's already a proper Npgsql connection string (contains Host=), use as-is
    if (databaseUrl.Contains("Host=") || databaseUrl.Contains("Server="))
    {
        return databaseUrl;
    }

    // Parse postgres:// or postgresql:// URL format (Render, Railway, Heroku, etc.)
    try
    {
        var url = databaseUrl.StartsWith("postgres://") ? databaseUrl.Replace("postgres://", "postgresql://") : databaseUrl;
        if (!url.StartsWith("postgresql://"))
        {
            url = "postgresql://" + url;
        }

        var uri = new Uri(url);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = uri.UserInfo.Split(':')[0],
            Password = uri.UserInfo.Split(':').Length > 1 ? uri.UserInfo.Split(':')[1] : "",
            SslMode = SslMode.Require,
            TrustServerCertificate = true
        };
        return builder.ConnectionString;
    }
    catch
    {
        // If parsing fails, return as-is and let Npgsql handle it
        return databaseUrl;
    }
}