/**
 * Financial Data Storage Service
 * Mengelola penyimpanan transaksi, due dates, budgets, dan metadata lainnya
 * Menggunakan AsyncStorage sebagai primary storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FinancialTransaction,
  DueDate,
  BudgetLimit,
  NotificationRawLog,
  FinancialSummary,
  TransactionCategory,
} from '../types/FinancialTransaction';

/**
 * Key constants untuk AsyncStorage
 */
const STORAGE_KEYS = {
  TRANSACTIONS: 'finote:transactions',
  DUE_DATES: 'finote:due_dates',
  BUDGETS: 'finote:budgets',
  RAW_NOTIFICATIONS: 'finote:raw_notifications',
  PARSER_CACHE: 'finote:parser_cache',
  SYNC_METADATA: 'finote:sync_metadata',
  APP_CONFIG: 'finote:app_config',
} as const;

/**
 * Financial Storage Service
 */
export class FinancialStorage {
  /**
   * TRANSACTIONS MANAGEMENT
   */

  static async addTransaction(transaction: FinancialTransaction): Promise<void> {
    const transactions = await this.getAllTransactions();
    transactions.push(transaction);
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static async getAllTransactions(): Promise<FinancialTransaction[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  }

  static async getTransactionById(id: string): Promise<FinancialTransaction | null> {
    const transactions = await this.getAllTransactions();
    return transactions.find(t => t.id === id) || null;
  }

  static async getTransactionsByDateRange(
    startDate: number,
    endDate: number,
  ): Promise<FinancialTransaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }

  static async getTransactionsByCategory(
    category: TransactionCategory,
  ): Promise<FinancialTransaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter(t => t.category === category);
  }

  static async updateTransaction(id: string, updates: Partial<FinancialTransaction>): Promise<void> {
    const transactions = await this.getAllTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Transaction ${id} not found`);
    }
    transactions[index] = {
      ...transactions[index],
      ...updates,
      updatedAt: Date.now(),
      isEdited: true,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static async deleteTransaction(id: string): Promise<void> {
    const transactions = await this.getAllTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
  }

  static async searchTransactions(query: string): Promise<FinancialTransaction[]> {
    const transactions = await this.getAllTransactions();
    const lowerQuery = query.toLowerCase();
    return transactions.filter(
      t =>
        t.description.toLowerCase().includes(lowerQuery) ||
        t.merchant?.toLowerCase().includes(lowerQuery) ||
        t.reference?.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * DUE DATES MANAGEMENT
   */

  static async addDueDate(dueDate: DueDate): Promise<void> {
    const dueDates = await this.getAllDueDates();
    dueDates.push(dueDate);
    await AsyncStorage.setItem(STORAGE_KEYS.DUE_DATES, JSON.stringify(dueDates));
  }

  static async getAllDueDates(): Promise<DueDate[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DUE_DATES);
    return data ? JSON.parse(data) : [];
  }

  static async getDueDateById(id: string): Promise<DueDate | null> {
    const dueDates = await this.getAllDueDates();
    return dueDates.find(d => d.id === id) || null;
  }

  static async getUpcomingDueDates(daysFromNow: number = 7): Promise<DueDate[]> {
    const dueDates = await this.getAllDueDates();
    const now = Date.now();
    const futureDate = now + daysFromNow * 24 * 60 * 60 * 1000;
    return dueDates
      .filter(d => d.dueDate >= now && d.dueDate <= futureDate && !d.isPaid)
      .sort((a, b) => a.dueDate - b.dueDate);
  }

  static async getOverdueDueDates(): Promise<DueDate[]> {
    const dueDates = await this.getAllDueDates();
    const now = Date.now();
    return dueDates.filter(d => d.dueDate < now && !d.isPaid).sort((a, b) => a.dueDate - b.dueDate);
  }

  static async updateDueDate(id: string, updates: Partial<DueDate>): Promise<void> {
    const dueDates = await this.getAllDueDates();
    const index = dueDates.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`DueDate ${id} not found`);
    }
    dueDates[index] = {
      ...dueDates[index],
      ...updates,
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.DUE_DATES, JSON.stringify(dueDates));
  }

  static async deleteDueDate(id: string): Promise<void> {
    const dueDates = await this.getAllDueDates();
    const filtered = dueDates.filter(d => d.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.DUE_DATES, JSON.stringify(filtered));
  }

  /**
   * BUDGET MANAGEMENT
   */

  static async addBudget(budget: BudgetLimit): Promise<void> {
    const budgets = await this.getAllBudgets();
    budgets.push(budget);
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }

  static async getAllBudgets(): Promise<BudgetLimit[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
    return data ? JSON.parse(data) : [];
  }

  static async getBudgetByCategory(category: TransactionCategory): Promise<BudgetLimit | null> {
    const budgets = await this.getAllBudgets();
    return budgets.find(b => b.category === category) || null;
  }

  static async updateBudget(id: string, updates: Partial<BudgetLimit>): Promise<void> {
    const budgets = await this.getAllBudgets();
    const index = budgets.findIndex(b => b.id === id);
    if (index === -1) {
      throw new Error(`Budget ${id} not found`);
    }
    budgets[index] = {
      ...budgets[index],
      ...updates,
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }

  static async deleteBudget(id: string): Promise<void> {
    const budgets = await this.getAllBudgets();
    const filtered = budgets.filter(b => b.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(filtered));
  }

  /**
   * RAW NOTIFICATIONS MANAGEMENT (untuk debug dan parser testing)
   */

  static async addRawNotification(notification: NotificationRawLog): Promise<void> {
    const notifications = await this.getAllRawNotifications();
    notifications.push(notification);
    // Keep max 1000 raw notifications
    if (notifications.length > 1000) {
      notifications.splice(0, notifications.length - 1000);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.RAW_NOTIFICATIONS, JSON.stringify(notifications));
  }

  static async getAllRawNotifications(): Promise<NotificationRawLog[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RAW_NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  }

  static async clearRawNotifications(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.RAW_NOTIFICATIONS);
  }

  /**
   * PARSER CACHE
   */

  static async setCacheParserResult(
    packageName: string,
    notificationText: string,
    result: FinancialTransaction | null,
  ): Promise<void> {
    const cache = await this.getParserCache();
    const key = `${packageName}:${notificationText.substring(0, 50)}`;
    cache[key] = {
      result,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.PARSER_CACHE, JSON.stringify(cache));
  }

  static async getParserCache(): Promise<Record<string, {result: FinancialTransaction | null; timestamp: number}>> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PARSER_CACHE);
    return data ? JSON.parse(data) : {};
  }

  static async clearParserCache(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.PARSER_CACHE);
  }

  /**
   * SYNC METADATA
   */

  static async setSyncMetadata(metadata: {lastSyncedAt?: number; syncToken?: string}): Promise<void> {
    const current = await this.getSyncMetadata();
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_METADATA, JSON.stringify({...current, ...metadata}));
  }

  static async getSyncMetadata(): Promise<{lastSyncedAt?: number; syncToken?: string}> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_METADATA);
    return data ? JSON.parse(data) : {};
  }

  /**
   * APP CONFIG
   */

  static async setAppConfig(config: Record<string, any>): Promise<void> {
    const current = await this.getAppConfig();
    await AsyncStorage.setItem(STORAGE_KEYS.APP_CONFIG, JSON.stringify({...current, ...config}));
  }

  static async getAppConfig(): Promise<Record<string, any>> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_CONFIG);
    return data ? JSON.parse(data) : {};
  }

  /**
   * ANALYTICS & SUMMARY
   */

  static async calculateFinancialSummary(
    period: 'today' | 'week' | 'month' | 'all',
  ): Promise<FinancialSummary> {
    const transactions = await this.getAllTransactions();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let startDate: number;
    let endDate: number;

    switch (period) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate = today.getTime();
        endDate = now;
        break;

      case 'week':
        const weekAgo = now - 7 * dayMs;
        startDate = weekAgo;
        endDate = now;
        break;

      case 'month':
        const monthAgo = now - 30 * dayMs;
        startDate = monthAgo;
        endDate = now;
        break;

      case 'all':
        startDate = 0;
        endDate = now;
        break;
    }

    const filtered = transactions.filter(t => t.date >= startDate && t.date <= endDate);

    const summary: FinancialSummary = {
      period,
      startDate,
      endDate,
      totalIncome: 0,
      totalExpense: 0,
      netCashFlow: 0,
      expenseByCategory: {} as Record<TransactionCategory, number>,
      incomeByCategory: {} as Record<TransactionCategory, number>,
      transactionCount: filtered.length,
      incomeCount: 0,
      expenseCount: 0,
      topExpenseCategories: [],
      topIncomeCategories: [],
      dailyCashflow: [],
    };

    filtered.forEach(t => {
      if (t.type === 'income') {
        summary.totalIncome += t.amount;
        summary.incomeCount++;
        summary.incomeByCategory[t.category] = (summary.incomeByCategory[t.category] || 0) + t.amount;
      } else if (t.type === 'expense') {
        summary.totalExpense += t.amount;
        summary.expenseCount++;
        summary.expenseByCategory[t.category] = (summary.expenseByCategory[t.category] || 0) + t.amount;
      }
    });

    summary.netCashFlow = summary.totalIncome - summary.totalExpense;

    // Top categories
    summary.topExpenseCategories = Object.entries(summary.expenseByCategory)
      .map(([category, amount]) => ({category: category as TransactionCategory, amount}))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    summary.topIncomeCategories = Object.entries(summary.incomeByCategory)
      .map(([category, amount]) => ({category: category as TransactionCategory, amount}))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return summary;
  }

  /**
   * DATA EXPORT & IMPORT (untuk future backup/restore)
   */

  static async exportAllData(): Promise<string> {
    const [transactions, dueDates, budgets, config, syncMeta] = await Promise.all([
      this.getAllTransactions(),
      this.getAllDueDates(),
      this.getAllBudgets(),
      this.getAppConfig(),
      this.getSyncMetadata(),
    ]);

    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      dueDates,
      budgets,
      config,
      syncMeta,
    });
  }

  static async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      if (data.version !== 1) {
        throw new Error('Unsupported import version');
      }

      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions || []));
      await AsyncStorage.setItem(STORAGE_KEYS.DUE_DATES, JSON.stringify(data.dueDates || []));
      await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(data.budgets || []));
      await AsyncStorage.setItem(STORAGE_KEYS.APP_CONFIG, JSON.stringify(data.config || {}));
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_METADATA, JSON.stringify(data.syncMeta || {}));
    } catch (error) {
      throw new Error(`Failed to import data: ${error}`);
    }
  }

  /**
   * CLEANUP & MAINTENANCE
   */

  static async clearAllData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS),
      AsyncStorage.removeItem(STORAGE_KEYS.DUE_DATES),
      AsyncStorage.removeItem(STORAGE_KEYS.BUDGETS),
      AsyncStorage.removeItem(STORAGE_KEYS.RAW_NOTIFICATIONS),
      AsyncStorage.removeItem(STORAGE_KEYS.PARSER_CACHE),
      AsyncStorage.removeItem(STORAGE_KEYS.SYNC_METADATA),
      AsyncStorage.removeItem(STORAGE_KEYS.APP_CONFIG),
    ]);
  }
}
