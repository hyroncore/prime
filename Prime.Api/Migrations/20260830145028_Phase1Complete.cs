using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Prime.Api.Migrations
{
    /// <inheritdoc />
    public partial class Phase1Complete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ManagerId",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ApprovedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ArchivedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeclinedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeclinedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "InternalApprovedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsInternallyApproved",
                table: "PurchaseRequisitions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "OutcomeRecordedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OutcomeRecordedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProcessedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RevisedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RevisedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RevisionNotes",
                table: "PurchaseRequisitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SubmittedById",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PermissionId = table.Column<int>(type: "integer", nullable: false),
                    IsGranted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserPermissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    PermissionId = table.Column<int>(type: "integer", nullable: false),
                    IsGranted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPermissions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_ManagerId",
                table: "Users",
                column: "ManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_ApprovedById",
                table: "PurchaseRequisitions",
                column: "ApprovedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_ArchivedById",
                table: "PurchaseRequisitions",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_CreatedById",
                table: "PurchaseRequisitions",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_DeclinedById",
                table: "PurchaseRequisitions",
                column: "DeclinedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_OutcomeRecordedById",
                table: "PurchaseRequisitions",
                column: "OutcomeRecordedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_ProcessedById",
                table: "PurchaseRequisitions",
                column: "ProcessedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_RevisedById",
                table: "PurchaseRequisitions",
                column: "RevisedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_SubmittedById",
                table: "PurchaseRequisitions",
                column: "SubmittedById");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Key",
                table: "Permissions",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_Role_PermissionId",
                table: "RolePermissions",
                columns: new[] { "Role", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissions_PermissionId",
                table: "UserPermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissions_UserId_PermissionId",
                table: "UserPermissions",
                columns: new[] { "UserId", "PermissionId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_ApprovedById",
                table: "PurchaseRequisitions",
                column: "ApprovedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_ArchivedById",
                table: "PurchaseRequisitions",
                column: "ArchivedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_CreatedById",
                table: "PurchaseRequisitions",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_DeclinedById",
                table: "PurchaseRequisitions",
                column: "DeclinedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_OutcomeRecordedById",
                table: "PurchaseRequisitions",
                column: "OutcomeRecordedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_ProcessedById",
                table: "PurchaseRequisitions",
                column: "ProcessedById",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_RevisedById",
                table: "PurchaseRequisitions",
                column: "RevisedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_SubmittedById",
                table: "PurchaseRequisitions",
                column: "SubmittedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Users_ManagerId",
                table: "Users",
                column: "ManagerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_ApprovedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_ArchivedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_CreatedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_DeclinedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_OutcomeRecordedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_ProcessedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_RevisedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_SubmittedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Users_ManagerId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "UserPermissions");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropIndex(
                name: "IX_Users_ManagerId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_ApprovedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_ArchivedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_CreatedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_DeclinedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_OutcomeRecordedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_ProcessedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_RevisedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_SubmittedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ManagerId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ApprovedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "ArchivedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "DeclinedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "DeclinedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "InternalApprovedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "IsInternallyApproved",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "OutcomeRecordedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "OutcomeRecordedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "ProcessedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "RevisedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "RevisedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "RevisionNotes",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "SubmittedById",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "PurchaseRequisitions");
        }
    }
}
