using Prime.Api.Data;

namespace Prime.Api.Services;

public class NotificationScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _clock;
    private readonly IConfiguration _config;
    private readonly ILogger<NotificationScheduler> _logger;

    public NotificationScheduler(
        IServiceScopeFactory scopeFactory,
        TimeProvider clock,
        IConfiguration config,
        ILogger<NotificationScheduler> logger)
    {
        _scopeFactory = scopeFactory;
        _clock = clock;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunOnceAsync(stoppingToken);

        var intervalMinutes = _config.GetValue("Notifications:CheckIntervalMinutes", 10);
        if (intervalMinutes < 1) intervalMinutes = 10;

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(intervalMinutes));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunOnceAsync(stoppingToken);
        }
    }

    internal async Task RunOnceAsync(CancellationToken ct = default)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<PrimeDbContext>();

            var engine = new NotificationEngine(
                _config.GetValue("Notifications:DeadlineWarningWindowDays", 7),
                _config.GetValue("Notifications:SubmittedFollowUpDays", 30),
                _config.GetValue("Notifications:SubmittedFollowUpRepeatDays", 7));

            await engine.RunAsync(db, _clock.GetUtcNow().UtcDateTime, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NotificationScheduler: run failed");
        }
    }
}