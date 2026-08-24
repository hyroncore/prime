using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Prime.Api.Controllers;
using Prime.Api.Services;

namespace Prime.Api.Tests;

public class AuthEnforcementTests
{
    [Theory]
    [InlineData(typeof(RequisitionsController))]
    [InlineData(typeof(ClientsController))]
    [InlineData(typeof(PlantsController))]
    [InlineData(typeof(AttachmentsController))]
    public void DeleteAction_RequiresAdminRole(Type controllerType)
    {
        var deleteAction = controllerType
            .GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Single(method => method.GetCustomAttribute<HttpDeleteAttribute>() is not null);

        var auth = deleteAction.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(auth);
        Assert.Equal(UserRoles.Admin, auth.Roles);
    }

    [Fact]
    public void UsersController_RequiresAdminRole()
    {
        var auth = typeof(UsersController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(auth);
        Assert.Equal(UserRoles.Admin, auth.Roles);
    }

    [Fact]
    public void LoginAction_IsAnonymous()
    {
        var login = typeof(AuthController)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Single(method =>
                method.GetCustomAttribute<HttpPostAttribute>()?.Template == "login");

        Assert.NotNull(login.GetCustomAttribute<AllowAnonymousAttribute>());
    }

    [Fact]
    public void AuthController_OnlyLoginIsAnonymous()
    {
        var methods = typeof(AuthController)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Where(method => method.GetCustomAttributes<HttpMethodAttribute>().Any());

        foreach (var method in methods)
        {
            var isLogin = method.GetCustomAttribute<HttpPostAttribute>()?.Template == "login";
            Assert.Equal(isLogin, method.GetCustomAttribute<AllowAnonymousAttribute>() is not null);
        }
    }
}