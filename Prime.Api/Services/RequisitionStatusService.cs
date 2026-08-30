using Prime.Api.Models;

namespace Prime.Api.Services;

public static class RequisitionStatusService
{
    private static readonly Dictionary<RequisitionStatus, TransitionRule[]> TransitionRules = new()
    {
        [RequisitionStatus.NEW] = new[]
        {
            new TransitionRule(RequisitionStatus.REVIEW, "req:submit_review", "User"),
        },
        [RequisitionStatus.REVIEW] = new[]
        {
            new TransitionRule(RequisitionStatus.PROCESSING, "req:review_action", "Manager"),
            new TransitionRule(RequisitionStatus.DECLINED, "req:review_action", "Manager"),
        },
        [RequisitionStatus.PROCESSING] = new[]
        {
            new TransitionRule(RequisitionStatus.SUBMITTED, "req:request_submit", "User"),
            new TransitionRule(RequisitionStatus.REVISE, "req:request_revision", "Manager"),
        },
        [RequisitionStatus.SUBMITTED] = new[]
        {
            new TransitionRule(RequisitionStatus.APPROVED, "req:approve_internal", "Manager"),
            new TransitionRule(RequisitionStatus.REVISE, "req:request_revision", "Manager"),
        },
        [RequisitionStatus.APPROVED] = new[]
        {
            new TransitionRule(RequisitionStatus.WON, "req:mark_outcome", "User"),
            new TransitionRule(RequisitionStatus.LOST, "req:mark_outcome", "User"),
        },
        [RequisitionStatus.REVISE] = new[]
        {
            new TransitionRule(RequisitionStatus.PROCESSING, "req:review_action", "Manager"),
        },
        [RequisitionStatus.DECLINED] = Array.Empty<TransitionRule>(),
        [RequisitionStatus.WON] = new[]
        {
            new TransitionRule(RequisitionStatus.ARCHIVE, "system:archive", "System"),
        },
        [RequisitionStatus.LOST] = new[]
        {
            new TransitionRule(RequisitionStatus.ARCHIVE, "system:archive", "System"),
        },
        [RequisitionStatus.DECLINED] = new[]
        {
            new TransitionRule(RequisitionStatus.ARCHIVE, "system:archive", "System"),
        },
        [RequisitionStatus.ARCHIVE] = Array.Empty<TransitionRule>(),
    };

    public static bool CanTransition(RequisitionStatus from, RequisitionStatus to, string userRole, IEnumerable<string> userPermissions)
    {
        if (from == RequisitionStatus.ARCHIVE) return false;
        if (from == to) return false;

        if (!TransitionRules.TryGetValue(from, out var rules)) return false;

        var rule = rules.FirstOrDefault(r => r.To == to);
        if (rule == null) return false;

        if (rule.RequiredRole != "System" && rule.RequiredRole != userRole)
            return false;

        if (!userPermissions.Contains(rule.RequiredPermission))
            return false;

        return true;
    }

    public static IEnumerable<RequisitionStatus> GetValidTransitions(RequisitionStatus from, string userRole, IEnumerable<string> userPermissions)
    {
        if (!TransitionRules.TryGetValue(from, out var rules)) return Enumerable.Empty<RequisitionStatus>();

        return rules
            .Where(r => r.RequiredRole == "System" || r.RequiredRole == userRole)
            .Where(r => userPermissions.Contains(r.RequiredPermission))
            .Select(r => r.To);
    }

    public record TransitionRule(RequisitionStatus To, string RequiredPermission, string RequiredRole);
}