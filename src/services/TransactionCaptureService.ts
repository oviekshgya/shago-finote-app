/**
 * Transaction Capture Service
 * Bridge antara NotificationModule dan FinancialParser
 * Menangkap notifikasi, parse ke transaksi, dan simpan ke storage
 */

import { FinancialParser, type ParseResult } from '../parser/FinancialParser';
import { FinancialStorage } from '../storage/FinancialStorage';
import type { NotificationLog } from '../types/NotificationLog';
import type { FinancialTransaction, NotificationRawLog } from '../types/FinancialTransaction';
import { detectDuplicate } from '../utils/TransactionUtils';

export interface CaptureStats {
  totalNotifications: number;
  successfulParse: number;
  duplicates: number;
  excluded: number;
  errors: number;
}

/**
 * Transaction Capture Service
 */
export class TransactionCaptureService {
  private static isProcessing = false;
  private static lastProcessedNotificationId: string | null = null;

  /**
   * Initialize service dan setup parser
   */
  static initialize() {
    FinancialParser.initialize();
  }

  /**
   * Capture single notification dan convert to transaction
   */
  static async captureNotification(notification: NotificationLog): Promise<{
    success: boolean;
    transaction?: FinancialTransaction;
    rawLog?: NotificationRawLog;
    error?: string;
  }> {
    try {
      this.initialize();

      // Parse notifikasi. User-defined source rules take priority over default parser rules.
      const parseResult =
        (await this.parseWithUserRule(notification)) ?? FinancialParser.parse(notification);

      if (!parseResult.success || !parseResult.transaction) {
        // Log raw notification untuk debugging
        const rawLog: NotificationRawLog = {
          id: notification.id,
          packageName: notification.packageName,
          title: notification.title,
          text: notification.text,
          bigText: notification.bigText,
          subText: notification.subText,
          notificationId: notification.notificationId,
          tag: notification.tag ?? undefined,
          postTime: notification.postTime,
          receivedAt: notification.receivedAt,
          parserAttempted: true,
          parserResult: null,
          parserError: parseResult.error,
        };

        await FinancialStorage.addRawNotification(rawLog);

        return {
          success: false,
          rawLog,
          error: parseResult.error,
        };
      }

      const transaction = parseResult.transaction;

      // Check for duplicates
      const allTransactions = await FinancialStorage.getAllTransactions();
      const isDuplicate = detectDuplicate(transaction, allTransactions);

      if (isDuplicate) {
        transaction.isDuplicate = true;
        // Don't save duplicate
        return {
          success: false,
          transaction,
          error: 'Duplicate transaction detected',
        };
      }

      // Save transaction
      await FinancialStorage.addTransaction(transaction);

      // Save raw log untuk audit
      const rawLog: NotificationRawLog = {
        id: notification.id,
        packageName: notification.packageName,
        title: notification.title,
        text: notification.text,
        bigText: notification.bigText,
        subText: notification.subText,
        notificationId: notification.notificationId,
        tag: notification.tag ?? undefined,
        postTime: notification.postTime,
        receivedAt: notification.receivedAt,
        parserAttempted: true,
        parserResult: transaction,
        parserError: undefined,
      };

      await FinancialStorage.addRawNotification(rawLog);

      // Cache result
      await FinancialStorage.setCacheParserResult(
        notification.packageName,
        `${notification.title} ${notification.text}`,
        transaction,
      );

      this.lastProcessedNotificationId = notification.id;

      return {
        success: true,
        transaction,
        rawLog,
      };
    } catch (error) {
      console.error('[TransactionCaptureService] Error capturing notification:', error);
      return {
        success: false,
        error: `Failed to capture notification: ${error}`,
      };
    }
  }

  /**
   * Batch capture multiple notifications
   */
  static async captureNotifications(
    notifications: NotificationLog[],
  ): Promise<{
    results: Array<{success: boolean; transaction?: FinancialTransaction; error?: string}>;
    stats: CaptureStats;
  }> {
    if (this.isProcessing) {
      console.warn('[TransactionCaptureService] Already processing, skipping batch');
      return {
        results: [],
        stats: {
          totalNotifications: 0,
          successfulParse: 0,
          duplicates: 0,
          excluded: 0,
          errors: 0,
        },
      };
    }

    this.isProcessing = true;

    try {
      this.initialize();

      const results = [];
      const stats: CaptureStats = {
        totalNotifications: notifications.length,
        successfulParse: 0,
        duplicates: 0,
        excluded: 0,
        errors: 0,
      };

      for (const notification of notifications) {
        const result = await this.captureNotification(notification);

        results.push({
          success: result.success,
          transaction: result.transaction,
          error: result.error,
        });

        if (result.success) {
          stats.successfulParse++;
        } else if (result.transaction?.isDuplicate) {
          stats.duplicates++;
        } else if (result.error?.includes('excluded')) {
          stats.excluded++;
        } else {
          stats.errors++;
        }
      }

      return { results, stats };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync notifikasi dari native module dan capture
   */
  static async syncFromNotificationModule(notificationModule: any): Promise<{
    captured: number;
    failed: number;
    duplicates: number;
  }> {
    try {
      // Get logs dari notification module
      const rawLogs = await notificationModule.getLogs();
      const notifications = JSON.parse(rawLogs || '[]') as NotificationLog[];

      if (notifications.length === 0) {
        return { captured: 0, failed: 0, duplicates: 0 };
      }

      const transactions = await FinancialStorage.getAllTransactions();
      const completedNotificationIds = new Set(
        transactions.map(transaction => transaction.rawNotificationId).filter(Boolean),
      );
      const pendingNotifications = notifications.filter(
        notification => !completedNotificationIds.has(notification.id),
      );

      if (pendingNotifications.length === 0) {
        return { captured: 0, failed: 0, duplicates: 0 };
      }

      const { stats } = await this.captureNotifications(pendingNotifications);

      return {
        captured: stats.successfulParse,
        failed: stats.errors + stats.excluded,
        duplicates: stats.duplicates,
      };
    } catch (error) {
      console.error('[TransactionCaptureService] Sync error:', error);
      return { captured: 0, failed: 1, duplicates: 0 };
    }
  }

  private static async parseWithUserRule(notification: NotificationLog): Promise<ParseResult | null> {
    const rules = await FinancialStorage.getCaptureRules();
    const rule = rules.find(
      item => item.enabled && item.packageName === notification.packageName,
    );

    if (!rule) {
      return null;
    }

    const text = this.getNotificationText(notification);
    const lowerText = text.toLowerCase();
    const incomeMatched = this.matchesAnyPrefix(lowerText, rule.incomePrefixes);
    const expenseMatched = this.matchesAnyPrefix(lowerText, rule.expensePrefixes);

    if (!incomeMatched && !expenseMatched) {
      return {
        success: false,
        confidence: 0,
        ruleName: `user-rule:${rule.packageName}`,
        error: `No income/expense prefix matched for ${rule.appLabel}`,
      };
    }

    const amount = this.extractCurrencyAmount(text);
    if (!amount) {
      return {
        success: false,
        confidence: 0,
        ruleName: `user-rule:${rule.packageName}`,
        error: `No supported currency amount found for ${rule.appLabel}`,
      };
    }

    const type = incomeMatched ? 'income' : 'expense';
    const now = Date.now();
    const transaction: FinancialTransaction = {
      id: `notif-${notification.id}`,
      sourceType: 'auto',
      sourceApp: rule.appLabel,
      sourcePackageName: notification.packageName,
      rawNotificationId: notification.id,
      type,
      status: 'completed',
      category: type === 'income' ? 'other' : 'shopping',
      amount,
      currency: 'IDR',
      description: `${notification.title || rule.appLabel} - ${notification.text || notification.bigText || ''}`.trim(),
      merchant: this.extractCounterparty(text),
      date: notification.postTime || notification.receivedAt || now,
      createdAt: now,
      updatedAt: now,
      parserConfidence: 90,
      parserRuleName: `user-rule:${rule.packageName}`,
      parserVersion: 'user-prefix-v1',
      syncStatus: 'pending',
      isDuplicate: false,
      isEdited: false,
      isHidden: false,
      isVerified: false,
    };

    return {
      success: true,
      transaction,
      confidence: 90,
      ruleName: `user-rule:${rule.packageName}`,
    };
  }

  private static getNotificationText(notification: NotificationLog): string {
    return [
      notification.title,
      notification.text,
      notification.subText,
      notification.bigText,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private static matchesAnyPrefix(text: string, prefixes: string[]): boolean {
    return prefixes
      .map(prefix => prefix.trim().toLowerCase())
      .filter(Boolean)
      .some(prefix => text.includes(prefix));
  }

  private static extractCurrencyAmount(text: string): number | null {
    const matches = text.match(/(?:rp|idr)\s*[\d.,]+|[\d.,]+\s*(?:rp|idr)/gi);
    if (!matches || matches.length === 0) {
      return null;
    }
    const amounts = matches
      .map(match => this.parseLocalizedAmount(match))
      .filter(amount => amount > 0)
      .sort((a, b) => b - a);

    return amounts[0] || null;
  }

  private static parseLocalizedAmount(value: string): number {
    const numeric = value
      .replace(/rp|idr/gi, '')
      .replace(/\s/g, '')
      .replace(/[^\d.,]/g, '');

    if (!numeric) {
      return 0;
    }

    const lastDot = numeric.lastIndexOf('.');
    const lastComma = numeric.lastIndexOf(',');
    let normalized = numeric;

    if (lastDot >= 0 && lastComma >= 0) {
      if (lastDot > lastComma) {
        normalized = numeric.replace(/,/g, '');
      } else {
        normalized = numeric.replace(/\./g, '').replace(',', '.');
      }
    } else if (lastDot >= 0) {
      const decimals = numeric.length - lastDot - 1;
      normalized = decimals === 3 ? numeric.replace(/\./g, '') : numeric;
    } else if (lastComma >= 0) {
      const decimals = numeric.length - lastComma - 1;
      normalized = decimals === 3 ? numeric.replace(/,/g, '') : numeric.replace(',', '.');
    }

    const amount = Number(normalized);
    return Number.isFinite(amount) ? Math.floor(amount) : 0;
  }

  private static extractCounterparty(text: string): string | undefined {
    const match = text.match(/(?:dari|ke|di|kepada)\s+([A-Za-z0-9 ._-]{3,32})/i);
    return match?.[1]?.trim();
  }

  /**
   * Get capture statistics
   */
  static async getCaptureStats(): Promise<CaptureStats> {
    const transactions = await FinancialStorage.getAllTransactions();
    const rawLogs = await FinancialStorage.getAllRawNotifications();

    const successfulParse = transactions.length;
    const totalNotifications = rawLogs.length;
    const duplicates = transactions.filter(t => t.isDuplicate).length;

    const excluded = rawLogs.filter(log => log.parserError?.includes('excluded')).length;
    const errors = totalNotifications - successfulParse - duplicates - excluded;

    return {
      totalNotifications,
      successfulParse,
      duplicates,
      excluded,
      errors,
    };
  }

  /**
   * Get parser health (accuracy metrics)
   */
  static async getParserHealth(): Promise<{
    totalAttempts: number;
    successRate: number;
    topFailureReasons: Array<{reason: string; count: number}>;
    topSuccessfulBanks: Array<{bank: string; count: number}>;
  }> {
    const rawLogs = await FinancialStorage.getAllRawNotifications();
    const transactions = await FinancialStorage.getAllTransactions();

    const totalAttempts = rawLogs.length;
    const successCount = rawLogs.filter(log => log.parserResult).length;
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    // Analyze failure reasons
    const failureReasons = new Map<string, number>();
    rawLogs.forEach(log => {
      if (!log.parserResult && log.parserError) {
        const reason = log.parserError.split(':')[0]; // Extract main reason
        failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
      }
    });

    const topFailureReasons = Array.from(failureReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Analyze successful banks
    const successfulBanks = new Map<string, number>();
    transactions.forEach(t => {
      if (t.sourceApp) {
        successfulBanks.set(t.sourceApp, (successfulBanks.get(t.sourceApp) || 0) + 1);
      }
    });

    const topSuccessfulBanks = Array.from(successfulBanks.entries())
      .map(([bank, count]) => ({ bank, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAttempts,
      successRate,
      topFailureReasons,
      topSuccessfulBanks,
    };
  }

  /**
   * Re-parse failed notifications dengan improved rules
   */
  static async reparseFailedNotifications(): Promise<{
    reParsed: number;
    stillFailed: number;
  }> {
    const rawLogs = await FinancialStorage.getAllRawNotifications();
    const failedLogs = rawLogs.filter(log => !log.parserResult);

    let reParsed = 0;
    let stillFailed = 0;

    for (const log of failedLogs) {
      // Convert to NotificationLog format
      const notification: NotificationLog = {
        id: log.id,
        packageName: log.packageName,
        title: log.title,
        text: log.text,
        bigText: log.bigText,
        subText: log.subText,
        notificationId: log.notificationId,
        tag: log.tag,
        postTime: log.postTime,
        receivedAt: log.receivedAt,
      };

      const parseResult = FinancialParser.parse(notification);

      if (parseResult.success && parseResult.transaction) {
        // Save newly parsed transaction
        await FinancialStorage.addTransaction(parseResult.transaction);
        reParsed++;
      } else {
        stillFailed++;
      }
    }

    return { reParsed, stillFailed };
  }

  /**
   * Register custom parser rule untuk bank baru
   */
  static registerCustomRule(rule: any) {
    FinancialParser.registerRule(rule);
  }

  /**
   * Get all available parser rules
   */
  static getAvailableRules() {
    return FinancialParser.getAllRules();
  }

  /**
   * Get last processed notification ID (untuk incremental sync)
   */
  static getLastProcessedNotificationId(): string | null {
    return this.lastProcessedNotificationId;
  }

  /**
   * Clear all captured data (cleanup/reset)
   */
  static async clearAllCapturedData(): Promise<void> {
    await FinancialStorage.clearAllData();
    this.lastProcessedNotificationId = null;
  }
}
