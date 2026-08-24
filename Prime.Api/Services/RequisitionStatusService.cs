using Prime.Api.Models;

namespace Prime.Api.Services;

public static class RequisitionStatusService
{
    private static readonly Dictionary<RequisitionStatus, RequisitionStatus[]> AllowedTransitions = new()
    {
        [RequisitionStatus.NEW] = new[] { RequisitionStatus.REVIEW },
        [RequisitionStatus.REVIEW] = new[] { RequisitionStatus.PROCESSING, RequisitionStatus.DECLINED },
        [RequisitionStatus.PROCESSING] = new[] { RequisitionStatus.SUBMITTED },
        [RequisitionStatus.SUBMITTED] = new[] { RequisitionStatus.WON, RequisitionStatus.LOST },
        [RequisitionStatus.DECLINED] = Array.Empty<RequisitionStatus>(),
        [RequisitionStatus.WON] = Array.Empty<RequisitionStatus>(),
        [RequisitionStatus.LOST] = Array.Empty<RequisitionStatus>()
    };

    public static bool IsTransitionAllowed(RequisitionStatus from, RequisitionStatus to)
    {
        if (from == to)
        {
            return true;
        }

        return AllowedTransitions.TryGetValue(from, out var targets) && targets.Contains(to);
    }
}