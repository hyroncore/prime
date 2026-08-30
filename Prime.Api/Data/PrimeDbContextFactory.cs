using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Prime.Api.Data;

namespace Prime.Api.Data;

public class PrimeDbContextFactory : IDesignTimeDbContextFactory<PrimeDbContext>
{
    public PrimeDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PrimeDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Database=prime;Username=postgres;Password=postgres");
        return new PrimeDbContext(optionsBuilder.Options);
    }
}