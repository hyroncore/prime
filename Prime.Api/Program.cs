using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
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

// Build connection string from DATABASE_URL (Render) or appsettings.json
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

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<LoginThrottle>();
builder.Services.AddHostedService<Prime.Api.Services.NotificationScheduler>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PrimeDbContext>();
    DbSeeder.Seed(db);
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireAuthorization();
app.MapHealthChecks("/api/health");

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapFallbackToFile("index.html");

app.Run();

static string BuildConnectionString(IConfiguration config)
{
    // Check multiple possible environment variable names (Render, Railway, etc.)
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