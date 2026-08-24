using System.Collections.Concurrent;

namespace Prime.Api.Services;

public class LoginThrottle(TimeProvider time)
{
    private const int MaxAttempts = 5;
    private static readonly TimeSpan LockWindow = TimeSpan.FromMinutes(5);

    private sealed class Entry
    {
        public List<DateTimeOffset> Failures { get; } = [];
        public DateTimeOffset? LockedUntil { get; set; }
    }

    private readonly ConcurrentDictionary<string, Entry> _entries = new();

    public DateTimeOffset? LockedUntil(string username)
    {
        if (!_entries.TryGetValue(username, out var entry)) return null;
        if (entry.LockedUntil is { } until && until <= time.GetUtcNow())
        {
            _entries.TryRemove(username, out _);
            return null;
        }
        return entry.LockedUntil;
    }

    public void RegisterFailure(string username)
    {
        var entry = _entries.GetOrAdd(username, _ => new Entry());
        var now = time.GetUtcNow();
        entry.Failures.RemoveAll(failure => now - failure > LockWindow);
        entry.Failures.Add(now);
        if (entry.Failures.Count >= MaxAttempts)
        {
            entry.LockedUntil = now + LockWindow;
            entry.Failures.Clear();
        }
    }

    public void Reset(string username)
    {
        _entries.TryRemove(username, out _);
    }
}