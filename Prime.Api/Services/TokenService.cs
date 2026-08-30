using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Prime.Api.Models;

namespace Prime.Api.Services;

public class TokenService(IConfiguration config, TimeProvider time)
{
    private readonly string _key =
        config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured");
    private readonly string _issuer = config["Jwt:Issuer"] ?? "Prime.Api";
    private readonly string _audience = config["Jwt:Audience"] ?? "Prime.Web";
    private readonly double _expiryHours =
        double.TryParse(config["Jwt:ExpiryHours"], out var hours) ? hours : 12;

    public string CreateToken(AppUser user)
    {
        var permissions = new HashSet<string>();
        
        string[] rolePermissions = user.Role switch
        {
            "Admin" => new[] { "admin:manage_system", "req:create", "req:edit", "req:delete", "req:submit_review", "req:review_action", "req:request_submit", "req:approve_internal", "req:request_revision", "req:mark_outcome" },
            "Manager" => new[] { "req:review_action", "req:approve_internal", "req:request_revision" },
            "User" => new[] { "req:create", "req:edit", "req:submit_review", "req:request_submit", "req:mark_outcome" },
            _ => Array.Empty<string>()
        };

        foreach (var perm in rolePermissions)
        {
            permissions.Add(perm);
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
        };

        foreach (var perm in permissions)
        {
            claims.Add(new Claim("permission", perm));
        }

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: time.GetUtcNow().UtcDateTime.AddHours(_expiryHours),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}