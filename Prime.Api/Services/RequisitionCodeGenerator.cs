using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Prime.Api.Data;
using Prime.Api.Models;

namespace Prime.Api.Services;

public static class RequisitionCodeGenerator
{
    public const int MaxHexSequence = 0xFFFF;

    /// <summary>
    /// Builds a PR identifier: {PlantCode}-{SectorCode}-{4 uppercase hex digits}
    /// e.g. "LB-03-01C8". Always exactly 10 characters, matches /^[A-Z]{2}-[0-9]{2}-[0-9A-F]{4}$/.
    /// </summary>
    public static string BuildIdentifier(string plantShortCode, string sectorCode, int sequenceValue)
        => $"{plantShortCode.ToUpperInvariant()}-{sectorCode}-{sequenceValue.ToString("X4")}";

    /// <summary>
    /// Atomically retrieves the next hex sequence for the (plant, sector) pair using
    /// a single PostgreSQL INSERT ... ON CONFLICT DO UPDATE ... RETURNING statement.
    /// This is safe with EnableRetryOnFailure — no manual transaction needed.
    /// </summary>
    public static async Task<(string Identifier, int Sequence)> NextIdentifierAsync(
        PrimeDbContext db,
        string plantShortCode,
        string sectorCode)
    {
        var plantCode = plantShortCode.ToUpperInvariant();

        // Atomic upsert: insert row with value=1, or increment existing row's value.
        // Returns the new current_value in a single round-trip.
        var next = await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            var result = await db.Database.SqlQueryRaw<int>(
                @"INSERT INTO ""RequisitionSequences"" (""PlantShortCode"", ""SectorCode"", ""CurrentValue"")
                  VALUES ({0}, {1}, 1)
                  ON CONFLICT (""PlantShortCode"", ""SectorCode"")
                  DO UPDATE SET ""CurrentValue"" = ""RequisitionSequences"".""CurrentValue"" + 1
                  RETURNING ""CurrentValue""",
                plantCode, sectorCode)
                .ToListAsync();

            return result[0];
        });

        if (next > MaxHexSequence)
        {
            throw new InvalidOperationException(
                $"تجاوز حد التسلسل ({MaxHexSequence:X4}) لهذا القسم في المصنع {plantCode}");
        }

        return (BuildIdentifier(plantCode, sectorCode, next), next);
    }
}
