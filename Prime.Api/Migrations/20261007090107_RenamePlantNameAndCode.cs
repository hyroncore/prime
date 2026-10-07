using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Prime.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenamePlantNameAndCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Plants_ShortCode",
                table: "Plants");

            migrationBuilder.RenameColumn(
                name: "PlantName",
                table: "Plants",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "ShortCode",
                table: "Plants",
                newName: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_Plants_Code",
                table: "Plants",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Plants_Code",
                table: "Plants");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Plants",
                newName: "PlantName");

            migrationBuilder.RenameColumn(
                name: "Code",
                table: "Plants",
                newName: "ShortCode");

            migrationBuilder.CreateIndex(
                name: "IX_Plants_ShortCode",
                table: "Plants",
                column: "ShortCode",
                unique: true);
        }
    }
}
