namespace ShagoFinote.Api.Presentation.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShagoFinote.Api.Application.DTOs.Transactions;
using ShagoFinote.Api.Application.Services;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    private readonly ILogger<TransactionsController> _logger;

    public TransactionsController(ITransactionService transactionService, ILogger<TransactionsController> logger)
    {
        _transactionService = transactionService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            throw new InvalidOperationException("Invalid user ID");
        return userId;
    }

    /// <summary>
    /// Get all transactions with filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResultResponse<TransactionDto>>> GetTransactions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? type = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? searchQuery = null)
    {
        try
        {
            var userId = GetUserId();
            var filter = new TransactionFilterRequest
            {
                Page = page,
                PageSize = pageSize,
                StartDate = startDate,
                EndDate = endDate,
                Type = type.HasValue ? (TransactionType?)type.Value : null,
                CategoryId = categoryId,
                SearchQuery = searchQuery
            };

            var result = await _transactionService.GetTransactionsAsync(userId, filter);
            return Ok(new PagedResultResponse<TransactionDto>
            {
                Items = result.Items,
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                TotalPages = result.TotalPages
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transactions");
            return StatusCode(500, new { message = "Error retrieving transactions" });
        }
    }

    /// <summary>
    /// Get single transaction by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<TransactionDto>> GetTransaction(Guid id)
    {
        try
        {
            var userId = GetUserId();
            var transaction = await _transactionService.GetTransactionAsync(userId, id);
            return Ok(transaction);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction {TransactionId}", id);
            return StatusCode(500, new { message = "Error retrieving transaction" });
        }
    }

    /// <summary>
    /// Create new transaction
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TransactionDto>> CreateTransaction(CreateTransactionRequest request)
    {
        try
        {
            var userId = GetUserId();
            var transaction = await _transactionService.CreateTransactionAsync(userId, request);
            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction");
            return StatusCode(500, new { message = "Error creating transaction" });
        }
    }

    /// <summary>
    /// Update transaction
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<TransactionDto>> UpdateTransaction(Guid id, UpdateTransactionRequest request)
    {
        try
        {
            var userId = GetUserId();
            var transaction = await _transactionService.UpdateTransactionAsync(userId, id, request);
            return Ok(transaction);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating transaction {TransactionId}", id);
            return StatusCode(500, new { message = "Error updating transaction" });
        }
    }

    /// <summary>
    /// Delete transaction
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(Guid id)
    {
        try
        {
            var userId = GetUserId();
            await _transactionService.DeleteTransactionAsync(userId, id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting transaction {TransactionId}", id);
            return StatusCode(500, new { message = "Error deleting transaction" });
        }
    }

    /// <summary>
    /// Bulk sync transactions from mobile
    /// </summary>
    [HttpPost("sync")]
    public async Task<ActionResult<BulkSyncResponse>> BulkSyncTransactions(BulkSyncTransactionsRequest request)
    {
        try
        {
            var userId = GetUserId();
            var result = await _transactionService.BulkSyncTransactionsAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing transactions");
            return StatusCode(500, new { message = "Error syncing transactions" });
        }
    }

    /// <summary>
    /// Get monthly totals for current month
    /// </summary>
    [HttpGet("monthly/totals")]
    public async Task<ActionResult<Dictionary<string, decimal>>> GetMonthlyTotals()
    {
        try
        {
            var userId = GetUserId();
            var totals = await _transactionService.GetMonthlyTotalAsync(userId);
            return Ok(totals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting monthly totals");
            return StatusCode(500, new { message = "Error retrieving monthly totals" });
        }
    }
}

public class PagedResultResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
