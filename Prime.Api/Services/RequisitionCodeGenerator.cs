using Microsoft.EntityFrameworkCore;
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
    /// Atomically retrieves the next hex sequence for the (plant, sector) pair.
    /// The counter lives in the RequisitionSequences table and is incremented
    /// inside a transaction, serializing concurrent PR creations.
    /// </summary>
    public static async Task<(string Identifier, int Sequence)> NextIdentifierAsync(
        PrimeDbContext db,
        string plantShortCode,
        string sectorCode)
    {
        var plantCode = plantShortCode.ToUpperInvariant();

        await using var transaction = await db.Database.BeginTransactionAsync();

        var sequence = await db.RequisitionSequences
            .FirstOrDefaultAsync(s => s.PlantShortCode == plantCode && s.SectorCode == sectorCode);

        int next;
        if (sequence is null)
        {
            sequence = new RequisitionSequence
            {
                PlantShortCode = plantCode,
                SectorCode = sectorCode,
                CurrentValue = 1
            };
            db.RequisitionSequences.Add(sequence);
            next = 1;
        }
        else
        {
            sequence.CurrentValue += 1;
            next = sequence.CurrentValue;
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        if (next > MaxHexSequence)
        {
            throw new InvalidOperationException(
                $"تجاوز حد التسلسل ({MaxHexSequence:X4}) لهذا القسم في المصنع {plantCode}");
        }

        return (BuildIdentifier(plantCode, sectorCode, next), next);
    }
}
