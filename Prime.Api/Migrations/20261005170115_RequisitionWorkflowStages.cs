using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Prime.Api.Migrations
{
    /// <inheritdoc />
    public partial class RequisitionWorkflowStages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "PurchaseRequisitions"
                SET "Status" = 'INTERNAL_APPROVAL'
                WHERE "Status" = 'SUBMITTED';
                """);
            migrationBuilder.Sql(
                """
                UPDATE "PurchaseRequisitions"
                SET "Status" = 'SUBMITTED',
                    "SubmittedAt" = COALESCE("InternalApprovedAt", "SubmittedAt")
                WHERE "Status" = 'APPROVED';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "PurchaseRequisitions"
                SET "Status" = 'APPROVED'
                WHERE "Status" = 'SUBMITTED';
                """);
            migrationBuilder.Sql(
                """
                UPDATE "PurchaseRequisitions"
                SET "Status" = 'SUBMITTED'
                WHERE "Status" = 'INTERNAL_APPROVAL';
                """);
            migrationBuilder.Sql(
                """
                UPDATE "PurchaseRequisitions"
                SET "Status" = 'PROCESSING'
                WHERE "Status" IN ('MANAGER_REVIEW', 'READY_FOR_APPROVAL');
                """);
        }
    }
}
