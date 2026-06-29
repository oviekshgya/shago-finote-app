namespace ShagoFinote.Api.Domain.Entities;

public enum SyncStatus
{
    Pending = 0,
    InProgress = 1,
    Completed = 2,
    Failed = 3,
    Conflict = 4
}

public class SyncLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public string DeviceId { get; set; } = null!;
    
    public string DeviceName { get; set; } = null!;
    
    public SyncStatus Status { get; set; } = SyncStatus.Pending;
    
    public int RecordsSynced { get; set; } = 0;
    
    public int ConflictsResolved { get; set; } = 0;
    
    public string? ErrorMessage { get; set; }
    
    public DateTime SyncStartedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? SyncCompletedAt { get; set; }
    
    public string SyncDirection { get; set; } = "Bidirectional"; // Bidirectional, Upload, Download
    
    public string? ConflictResolutionStrategy { get; set; } // LastWriteWins, LocalPriority, RemotePriority
    
    public int DurationMilliseconds { get; set; } = 0;
    
    public double DataSizeMB { get; set; } = 0;
    
    // Navigation properties
    public User User { get; set; } = null!;
}
