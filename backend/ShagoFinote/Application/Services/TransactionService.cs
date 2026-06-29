namespace ShagoFinote.Api.Application.Services;

using Microsoft.EntityFrameworkCore;
using ShagoFinote.Api.Application.DTOs.Transactions;
using ShagoFinote.Api.Domain.Entities;
using ShagoFinote.Api.Infrastructure.Data;

public interface ITransactionService
{
    Task<PagedResult<TransactionDto>> GetTransactionsAsync(Guid userId, TransactionFilterRequest filter);
    Task<TransactionDto> GetTransactionAsync(Guid userId, Guid transactionId);
    Task<TransactionDto> CreateTransactionAsync(Guid userId, CreateTransactionRequest request);
    Task<TransactionDto> UpdateTransactionAsync(Guid userId, Guid transactionId, UpdateTransactionRequest request);
    Task DeleteTransactionAsync(Guid userId, Guid transactionId);
    Task<BulkSyncResponse> BulkSyncTransactionsAsync(Guid userId, BulkSyncTransactionsRequest request);
    Task<Dictionary<string, decimal>> GetMonthlyTotalAsync(Guid userId);
}

public class TransactionService : ITransactionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TransactionService> _logger;

    public TransactionService(ApplicationDbContext context, ILogger<TransactionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResult<TransactionDto>> GetTransactionsAsync(Guid userId, TransactionFilterRequest filter)
    {
        try
        {
            var query = _context.Transactions
                .Where(t => t.UserId == userId);

            // Apply filters
            if (filter.StartDate.HasValue)
                query = query.Where(t => t.TransactionDate >= filter.StartDate.Value);

            if (filter.EndDate.HasValue)
                query = query.Where(t => t.TransactionDate <= filter.EndDate.Value);

            if (filter.Type.HasValue)
                query = query.Where(t => t.Type == filter.Type.Value);

            if (filter.CategoryId.HasValue)
                query = query.Where(t => t.CategoryId == filter.CategoryId.Value);

            if (!string.IsNullOrEmpty(filter.SearchQuery))
                query = query.Where(t =>
                    (t.Description != null && t.Description.Contains(filter.SearchQuery)) ||
                    (t.Merchant != null && t.Merchant.Contains(filter.SearchQuery)) ||
                    t.ReferenceNumber != null && t.ReferenceNumber.Contains(filter.SearchQuery));

            // Order and paginate
            var totalCount = await query.CountAsync();
            var transactions = await query
                .Include(t => t.Category)
                .OrderByDescending(t => t.TransactionDate)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(t => MapToTransactionDto(t))
                .ToListAsync();

            return new PagedResult<TransactionDto>
            {
                Items = transactions,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transactions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<TransactionDto> GetTransactionAsync(Guid userId, Guid transactionId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.UserId == userId);

        if (transaction == null)
            throw new KeyNotFoundException($"Transaction {transactionId} not found.");

        return MapToTransactionDto(transaction);
    }

    public async Task<TransactionDto> CreateTransactionAsync(Guid userId, CreateTransactionRequest request)
    {
        try
        {
            var transaction = new Transaction
            {
                UserId = userId,
                Amount = request.Amount,
                Type = request.Type,
                Source = TransactionSource.Mobile,
                Description = request.Description,
                Merchant = request.Merchant,
                CategoryId = request.CategoryId,
                TransactionDate = request.TransactionDate,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Transaction created: {TransactionId} for user {UserId}", transaction.Id, userId);

            return await GetTransactionAsync(userId, transaction.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction for user {UserId}", userId);
            throw;
        }
    }

    public async Task<TransactionDto> UpdateTransactionAsync(Guid userId, Guid transactionId, UpdateTransactionRequest request)
    {
        try
        {
            var transaction = await _context.Transactions
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.UserId == userId);

            if (transaction == null)
                throw new KeyNotFoundException($"Transaction {transactionId} not found.");

            transaction.Amount = request.Amount;
            transaction.Type = request.Type;
            transaction.Description = request.Description;
            transaction.Merchant = request.Merchant;
            transaction.CategoryId = request.CategoryId;
            transaction.TransactionDate = request.TransactionDate;
            transaction.UpdatedAt = DateTime.UtcNow;

            _context.Transactions.Update(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Transaction updated: {TransactionId} for user {UserId}", transactionId, userId);

            return await GetTransactionAsync(userId, transactionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating transaction {TransactionId}", transactionId);
            throw;
        }
    }

    public async Task DeleteTransactionAsync(Guid userId, Guid transactionId)
    {
        try
        {
            var transaction = await _context.Transactions
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.UserId == userId);

            if (transaction == null)
                throw new KeyNotFoundException($"Transaction {transactionId} not found.");

            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Transaction deleted: {TransactionId} for user {UserId}", transactionId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting transaction {TransactionId}", transactionId);
            throw;
        }
    }

    public async Task<BulkSyncResponse> BulkSyncTransactionsAsync(Guid userId, BulkSyncTransactionsRequest request)
    {
        try
        {
            var synced = 0;
            var conflicts = 0;
            var errors = 0;

            foreach (var item in request.Transactions)
            {
                try
                {
                    var existingTransaction = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.UserId == userId && t.MobileLocalId == item.MobileLocalId);

                    if (existingTransaction != null)
                    {
                        // Update existing
                        existingTransaction.Amount = item.Amount;
                        existingTransaction.Type = item.Type;
                        existingTransaction.Description = item.Description;
                        existingTransaction.Merchant = item.Merchant;
                        existingTransaction.CategoryId = item.CategoryId;
                        existingTransaction.TransactionDate = item.TransactionDate;
                        existingTransaction.UpdatedAt = item.UpdatedAt;
                        existingTransaction.SyncedAt = DateTime.UtcNow;
                        existingTransaction.IsSynced = true;

                        _context.Transactions.Update(existingTransaction);
                    }
                    else
                    {
                        // Create new
                        var newTransaction = new Transaction
                        {
                            UserId = userId,
                            Amount = item.Amount,
                            Type = item.Type,
                            Source = TransactionSource.Mobile,
                            Description = item.Description,
                            Merchant = item.Merchant,
                            CategoryId = item.CategoryId,
                            TransactionDate = item.TransactionDate,
                            MobileLocalId = item.MobileLocalId,
                            CreatedAt = item.CreatedAt,
                            UpdatedAt = item.UpdatedAt,
                            SyncedAt = DateTime.UtcNow,
                            IsSynced = true,
                        };

                        _context.Transactions.Add(newTransaction);
                    }

                    synced++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing transaction {MobileLocalId}", item.MobileLocalId);
                    errors++;
                }
            }

            await _context.SaveChangesAsync();

            // Log sync activity
            var syncLog = new SyncLog
            {
                UserId = userId,
                DeviceId = request.DeviceId,
                DeviceName = request.DeviceName,
                Status = SyncStatus.Completed,
                RecordsSynced = synced,
                ConflictsResolved = conflicts,
                SyncCompletedAt = DateTime.UtcNow,
            };

            _context.SyncLogs.Add(syncLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Synced {Synced} transactions for user {UserId}", synced, userId);

            return new BulkSyncResponse
            {
                SyncedCount = synced,
                ConflictCount = conflicts,
                ErrorCount = errors,
                Message = $"Synced {synced} transactions successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk sync for user {UserId}", userId);
            throw;
        }
    }

    public async Task<Dictionary<string, decimal>> GetMonthlyTotalAsync(Guid userId)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);

        var result = new Dictionary<string, decimal>();

        var income = await _context.Transactions
            .Where(t => t.UserId == userId && t.Type == TransactionType.Income &&
                   t.TransactionDate >= startOfMonth && t.TransactionDate <= endOfMonth)
            .SumAsync(t => t.Amount);

        var expense = await _context.Transactions
            .Where(t => t.UserId == userId && t.Type == TransactionType.Expense &&
                   t.TransactionDate >= startOfMonth && t.TransactionDate <= endOfMonth)
            .SumAsync(t => t.Amount);

        result["income"] = income;
        result["expense"] = expense;
        result["net"] = income - expense;

        return result;
    }

    private TransactionDto MapToTransactionDto(Transaction transaction)
    {
        return new TransactionDto
        {
            Id = transaction.Id,
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            Type = transaction.Type,
            Source = transaction.Source,
            Description = transaction.Description,
            Merchant = transaction.Merchant,
            ReferenceNumber = transaction.ReferenceNumber,
            CategoryId = transaction.CategoryId,
            CategoryName = transaction.Category?.Name,
            TransactionDate = transaction.TransactionDate,
            CreatedAt = transaction.CreatedAt,
            UpdatedAt = transaction.UpdatedAt,
            IsSynced = transaction.IsSynced,
            ParserConfidence = transaction.ParserConfidence,
        };
    }
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (TotalCount + PageSize - 1) / PageSize;
}

public class BulkSyncResponse
{
    public int SyncedCount { get; set; }
    public int ConflictCount { get; set; }
    public int ErrorCount { get; set; }
    public string Message { get; set; } = null!;
}
