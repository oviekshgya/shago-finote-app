/**
 * Transaction Utility Functions
 */

import type { FinancialTransaction } from '../types/FinancialTransaction';

/**
 * Detect duplicate transactions berdasarkan amount, type, dan timing
 */
export function detectDuplicate(
  transaction: FinancialTransaction,
  existingTransactions: FinancialTransaction[],
  toleranceMinutes: number = 5,
): boolean {
  const toleranceMs = toleranceMinutes * 60 * 1000;

  return existingTransactions.some(existing => {
    // Check if amounts match
    if (existing.amount !== transaction.amount) {
      return false;
    }

    // Check if types match
    if (existing.type !== transaction.type) {
      return false;
    }

    // Check if categories match (optional)
    if (existing.category !== transaction.category) {
      return false;
    }

    // Check if time difference is within tolerance
    const dateDiff = Math.abs(existing.date - transaction.date);
    if (dateDiff > toleranceMs) {
      return false;
    }

    // Check if merchant matches (if exists)
    if (existing.merchant && transaction.merchant) {
      if (existing.merchant.toLowerCase() !== transaction.merchant.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Format nominal ke Rp format
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  });

  return formatter.format(amount);
}

/**
 * Format tanggal transaksi
 */
export function formatTransactionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (date.toDateString() === today.toDateString()) {
    return `Hari ini, ${timeStr}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Kemarin, ${timeStr}`;
  }

  return `${dateStr}, ${timeStr}`;
}

/**
 * Get category label dalam bahasa Indonesia
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    salary: 'Gaji',
    bonus: 'Bonus',
    freelance: 'Freelance',
    investment: 'Investasi',
    food: 'Makanan',
    transport: 'Transportasi',
    shopping: 'Belanja',
    utilities: 'Utilitas',
    entertainment: 'Hiburan',
    healthcare: 'Kesehatan',
    education: 'Pendidikan',
    subscription: 'Langganan',
    other: 'Lainnya',
  };

  return labels[category] || category;
}

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    income: 'Pemasukan',
    expense: 'Pengeluaran',
    transfer: 'Transfer',
  };

  return labels[type] || type;
}

/**
 * Group transactions by date
 */
export function groupTransactionsByDate(
  transactions: FinancialTransaction[],
): Record<string, FinancialTransaction[]> {
  const groups: Record<string, FinancialTransaction[]> = {};

  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const dateKey = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(transaction);
  });

  // Sort transactions within each date group by time (newest first)
  Object.values(groups).forEach(group => {
    group.sort((a, b) => b.date - a.date);
  });

  return groups;
}

/**
 * Calculate daily balance
 */
export function calculateDailyBalance(
  transactions: FinancialTransaction[],
  _startDate?: number,
): Record<string, number> {
  const dailyBalance: Record<string, number> = {};

  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const dateKey = date.toISOString().split('T')[0];

    if (!dailyBalance[dateKey]) {
      dailyBalance[dateKey] = 0;
    }

    if (transaction.type === 'income') {
      dailyBalance[dateKey] += transaction.amount;
    } else if (transaction.type === 'expense') {
      dailyBalance[dateKey] -= transaction.amount;
    }
  });

  return dailyBalance;
}

/**
 * Filter transactions by date range
 */
export function filterTransactionsByDateRange(
  transactions: FinancialTransaction[],
  startDate: number,
  endDate: number,
): FinancialTransaction[] {
  return transactions.filter(t => t.date >= startDate && t.date <= endDate);
}

/**
 * Filter transactions by type
 */
export function filterTransactionsByType(
  transactions: FinancialTransaction[],
  type: 'income' | 'expense' | 'transfer',
): FinancialTransaction[] {
  return transactions.filter(t => t.type === type);
}

/**
 * Calculate total by category
 */
export function calculateTotalByCategory(
  transactions: FinancialTransaction[],
): Record<string, number> {
  const totals: Record<string, number> = {};

  transactions.forEach(transaction => {
    if (!totals[transaction.category]) {
      totals[transaction.category] = 0;
    }
    totals[transaction.category] += transaction.amount;
  });

  return totals;
}

/**
 * Get spending insight
 */
export function getSpendingInsight(
  transactions: FinancialTransaction[],
  topN: number = 3,
): Array<{category: string; amount: number; percentage: number}> {
  const expenseTransactions = filterTransactionsByType(transactions, 'expense');
  const totalByCategory = calculateTotalByCategory(expenseTransactions);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  return Object.entries(totalByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN);
}

/**
 * Validate transaction data
 */
export function validateTransaction(transaction: FinancialTransaction): {valid: boolean; errors: string[]} {
  const errors: string[] = [];

  if (!transaction.id) {
    errors.push('Transaction ID is required');
  }

  if (transaction.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!transaction.description || transaction.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!transaction.type || !['income', 'expense', 'transfer'].includes(transaction.type)) {
    errors.push('Invalid transaction type');
  }

  if (!transaction.category) {
    errors.push('Category is required');
  }

  if (!transaction.date || transaction.date <= 0) {
    errors.push('Transaction date is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate month-over-month change
 */
export function calculateMonthlyChange(
  currentMonth: FinancialTransaction[],
  previousMonth: FinancialTransaction[],
): {income: number; expense: number; net: number} {
  const currentIncome = currentMonth
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentExpense = currentMonth
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevIncome = previousMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const prevExpense = previousMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return {
    income: prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0,
    expense: prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0,
    net:
      prevIncome - prevExpense > 0
        ? (currentIncome - currentExpense - (prevIncome - prevExpense)) / (prevIncome - prevExpense) * 100
        : 0,
  };
}

/**
 * Export transactions to CSV format (for backup)
 */
export function exportTransactionsToCSV(transactions: FinancialTransaction[]): string {
  const headers = [
    'Date',
    'Type',
    'Category',
    'Amount',
    'Currency',
    'Description',
    'Merchant',
    'Reference',
    'Source',
  ];

  const rows = transactions.map(t => [
    new Date(t.date).toISOString(),
    t.type,
    t.category,
    t.amount,
    t.currency,
    `"${t.description}"`,
    t.merchant || '',
    t.reference || '',
    t.sourceType,
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  return csvContent;
}
