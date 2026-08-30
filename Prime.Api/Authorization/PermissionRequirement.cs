using Microsoft.AspNetCore.Authorization;

namespace Prime.Api.Authorization;

public class PermissionRequirement : IAuthorizationRequirement
{
    public string PermissionKey { get; }
    public PermissionRequirement(string key) => PermissionKey = key;
}