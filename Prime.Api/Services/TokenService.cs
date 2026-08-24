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
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
        };
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