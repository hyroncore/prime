using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Tests;

public class NotificationRulesTests
{
    private static PurchaseRequisition Req(RequisitionStatus status, DateTime dueDate, int id = 1) => new()
    {
        Id = id,
        Identifier = $"LB-03-{id:D4}",
        ExternalRef = "SL75-2026",
        PlantId = 1,
        SectorCode = "03",
        Title = "توريد قطع غيار",
        Status = status.ToString(),
        DueDate = DateTime.SpecifyKind(dueDate.Date, DateTimeKind.Utc),
    };

    private static readonly DateTime Now = new(2026, 8, 16, 10, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Overdue_WhenDueDayPassed()
    {
        var req = Req(RequisitionStatus.NEW, new DateTime(2026, 8, 14, 0, 0, 0, DateTimeKind.Utc));

        var result = NotificationRules.Evaluate(req, null, Now, 7, 30, 7);

        var candidate = Assert.Single(result);
        Assert.Equal(NotificationTypes.Overdue, candidate.Type);
        Assert.Contains("متأخر", candidate.Title);
        Assert.StartsWith($"REQ:{req.Id}:OVERDUE:", candidate.DedupKey);
    }

    [Fact]
    public void DueToday_IsNotOverdue_AndIsDueSoon()
    {
        var req = Req(RequisitionStatus.NEW, Now.Date);

        var result = NotificationRules.Evaluate(req, null, Now, 7, 30, 7);

        var candidate = Assert.Single(result);
        Assert.Equal(NotificationTypes.DueSoon, candidate.Type);
        Assert.Contains("اليوم", candidate.Title);
    }

    [Fact]
    public void DueSoon_WithinWindow()
    {
        var req = Req(RequisitionStatus.REVIEW, Now.Date.AddDays(7));

        var result = NotificationRules.Evaluate(req, null, Now, 7, 30, 7);

        var candidate = Assert.Single(result);
        Assert.Equal(NotificationTypes.DueSoon, candidate.Type);
        Assert.Contains("7", candidate.Title);
    }

    [Fact]
    public void NoNotification_OutsideWindow()
    {
        var req = Req(RequisitionStatus.PROCESSING, Now.Date.AddDays(10));

        var result = NotificationRules.Evaluate(req, null, Now, 7, 30, 7);

        Assert.Empty(result);
    }

    [Fact]
    public void ClosedStatus_ProducesNothing()
    {
        var req = Req(RequisitionStatus.WON, Now.Date.AddDays(-30));

        var result = NotificationRules.Evaluate(req, null, Now, 7, 30, 7);

        Assert.Empty(result);
    }

    [Fact]
    public void SubmittedFollowUp_At30Days()
    {
        var req = Req(RequisitionStatus.SUBMITTED, Now.Date.AddDays(10));
        var submittedAt = Now.Date.AddDays(-30);

        var result = NotificationRules.Evaluate(req, submittedAt, Now, 7, 30, 7);

        var candidate = Assert.Single(result);
        Assert.Equal(NotificationTypes.SubmittedFollowUp, candidate.Type);
        Assert.Equal($"REQ:{req.Id}:FOLLOWUP:0", candidate.DedupKey);
    }

    [Fact]
    public void SubmittedFollowUp_RepeatsWeekly()
    {
        var req = Req(RequisitionStatus.SUBMITTED, Now.Date.AddDays(10));
        var submittedAt = Now.Date.AddDays(-37);

        var result = NotificationRules.Evaluate(req, submittedAt, Now, 7, 30, 7);

        var candidate = Assert.Single(result);
        Assert.Equal($"REQ:{req.Id}:FOLLOWUP:1", candidate.DedupKey);
    }

    [Fact]
    public void SubmittedFollowUp_NotYetDue()
    {
        var req = Req(RequisitionStatus.SUBMITTED, Now.Date.AddDays(10));
        var submittedAt = Now.Date.AddDays(-20);

        var result = NotificationRules.Evaluate(req, submittedAt, Now, 7, 30, 7);

        Assert.Empty(result);
    }
}