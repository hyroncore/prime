using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Models;

namespace Prime.Api.Services;

public class MultiTenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public MultiTenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? GetCurrentUserCompanyId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user == null) return null;

        var companyIdClaim = user.FindFirst("company_id");
        if (companyIdClaim != null && int.TryParse(companyIdClaim.Value, out var companyId))
        {
            return companyId;
        }

        // Fallback: check if user has company_id in claims
        var companyClaim = user.FindFirst("company");
        if (companyClaim != null && int.TryParse(companyClaim.Value, out var cid))
        {
            return cid;
        }

        return null;
    }

    public bool IsAdmin()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        return user?.IsInRole("Admin") == true;
    }

    public IQueryable<T> ApplyCompanyScope<T>(IQueryable<T> query) where T : class
    {
        var companyId = GetCurrentUserCompanyId();
        var isAdmin = IsAdmin();

        if (isAdmin || companyId == null)
        {
            return query;
        }

        // Check if entity has CompanyId property
        var companyIdProperty = typeof(T).GetProperty("CompanyId");
        if (companyIdProperty != null)
        {
            // Use reflection to build the where clause
            var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "e");
            var property = System.Linq.Expressions.Expression.Property(parameter, "CompanyId");
            var constant = System.Linq.Expressions.Expression.Constant(companyId);
            var equality = System.Linq.Expressions.Expression.Equal(property, constant);
            var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(equality, parameter);
            return query.Where(lambda);
        }

        return query;
    }
}