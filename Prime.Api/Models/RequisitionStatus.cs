namespace Prime.Api.Models;

public enum RequisitionStatus
{
    NEW,
    REVIEW,
    DECLINED,
    PROCESSING,
    MANAGER_REVIEW,
    READY_FOR_APPROVAL,
    INTERNAL_APPROVAL,
    SUBMITTED,
    APPROVED,
    REVISE,
    WON,
    LOST,
    ARCHIVE
}