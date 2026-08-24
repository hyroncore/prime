using Prime.Api.Models;

namespace Prime.Api.Services;

public sealed record NotificationCandidate(
    string Type,
    string Title,
    string Message,
    string DedupKey);

public static class NotificationRules
{
    private static readonly string[] OpenStatuses =
    {
        nameof(RequisitionStatus.NEW),
        nameof(RequisitionStatus.REVIEW),
        nameof(RequisitionStatus.PROCESSING)
    };

    public static List<NotificationCandidate> Evaluate(
        PurchaseRequisition requisition,
        DateTime? submittedAtUtc,
        DateTime nowUtc,
        int deadlineWarningWindowDays,
        int followUpAfterDays,
        int followUpRepeatDays)
    {
        var results = new List<NotificationCandidate>();

        if (OpenStatuses.Contains(requisition.Status))
        {
            var due = requisition.DueDate; // UTC midnight of the due day
            var today = nowUtc.Date;

            if (due < today)
            {
                var daysLate = (today - due.Date).Days;
                results.Add(new NotificationCandidate(
                    NotificationTypes.Overdue,
                    "طلب متأخر",
                    $"الطلب {requisition.Identifier} متأخر منذ {daysLate} يوم",
                    $"REQ:{requisition.Id}:OVERDUE:{today:yyyy-MM-dd}"));
            }
            else
            {
                var daysLeft = (due.Date - today).Days;
                if (daysLeft <= deadlineWarningWindowDays)
                {
                    results.Add(new NotificationCandidate(
                        NotificationTypes.DueSoon,
                        daysLeft == 0 ? "آخر موعد اليوم" : $"متبقي {daysLeft} يوم",
                        $"الطلب {requisition.Identifier} يستحق {FormatDue(due)}",
                        $"REQ:{requisition.Id}:DUE:{today:yyyy-MM-dd}"));
                }
            }
        }
        else if (requisition.Status == nameof(RequisitionStatus.SUBMITTED) && submittedAtUtc.HasValue)
        {
            var daysSince = (nowUtc.Date - submittedAtUtc.Value.Date).Days;
            if (daysSince >= followUpAfterDays)
            {
                var milestone = (daysSince - followUpAfterDays) / Math.Max(1, followUpRepeatDays);
                results.Add(new NotificationCandidate(
                    NotificationTypes.SubmittedFollowUp,
                    "متابعة مع الجهة",
                    $"تم تقديم الطلب {requisition.Identifier} قبل {daysSince} يوم — متابعة مع الجهة؟",
                    $"REQ:{requisition.Id}:FOLLOWUP:{milestone}"));
            }
        }

        return results;
    }

    private static string FormatDue(DateTime due)
    {
        var y = due.Year;
        var m = due.Month;
        var d = due.Day;
        return $"{d:D2}/{m:D2}/{y:D4}";
    }
}