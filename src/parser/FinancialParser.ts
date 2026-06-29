/**
 * Financial Parser Service
 * Mengubah notifikasi mentah menjadi transaksi keuangan terstruktur
 * Mendukung berbagai bank dan e-wallet Indonesia
 */

import uuid from 'react-native-uuid';
import type {
  FinancialTransaction,
  TransactionType,
  TransactionCategory,
  ParserRule,
} from '../types/FinancialTransaction';
import type { NotificationLog } from '../types/NotificationLog';

export interface ParseResult {
  success: boolean;
  transaction?: FinancialTransaction;
  confidence: number;
  ruleName?: string;
  error?: string;
}

/**
 * Default parser rules untuk berbagai bank dan e-wallet Indonesia
 */
export const DEFAULT_PARSER_RULES: Record<string, ParserRule> = {
  // BCA Mobile
  'com.bca.mobilebanking.android': {
    id: 'bca-mobile-1',
    bankName: 'BCA',
    packageName: 'com.bca.mobilebanking.android',
    titlePattern: /BCA|Transfer|Pembayaran/i,
    textPattern: /Rp\.|IDR/i,
    amountPattern: /Rp\s*[\d.,]+|IDR\s*[\d.,]+/gi,
    typeExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('transfer masuk') || text.includes('setor') || text.includes('giro masuk')) {
        return 'income';
      }
      return 'expense';
    },
    categoryExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('transfer')) return 'other';
      if (text.includes('bayar')) return 'utilities';
      return 'other';
    },
    version: 1,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  // BRI Mobile
  'com.bri.brimobile': {
    id: 'bri-mobile-1',
    bankName: 'BRI',
    packageName: 'com.bri.brimobile',
    titlePattern: /BRI|Transaksi|Pembayaran/i,
    textPattern: /Rp\.|IDR/i,
    amountPattern: /Rp\s*[\d.,]+|IDR\s*[\d.,]+/gi,
    typeExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('masuk') || text.includes('terima')) {
        return 'income';
      }
      return 'expense';
    },
    categoryExtractor: () => 'other',
    version: 1,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  // Mandiri
  'com.bankmandiri.apps': {
    id: 'mandiri-1',
    bankName: 'Mandiri',
    packageName: 'com.bankmandiri.apps',
    titlePattern: /Mandiri|Transaksi/i,
    textPattern: /Rp\.|IDR/i,
    amountPattern: /Rp\s*[\d.,]+|IDR\s*[\d.,]+/gi,
    typeExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('kredit') || text.includes('masuk')) {
        return 'income';
      }
      return 'expense';
    },
    categoryExtractor: () => 'other',
    version: 1,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  // DANA
  'com.dana.android': {
    id: 'dana-1',
    bankName: 'DANA',
    packageName: 'com.dana.android',
    titlePattern: /DANA|Dompet/i,
    textPattern: /Rp\.|IDR/i,
    amountPattern: /Rp\s*[\d.,]+|IDR\s*[\d.,]+/gi,
    typeExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('terima') || text.includes('masuk')) {
        return 'income';
      }
      return 'expense';
    },
    categoryExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('makanan') || text.includes('food')) return 'food';
      if (text.includes('transport') || text.includes('ojek')) return 'transport';
      return 'other';
    },
    version: 1,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  // OVO
  'id.ovo.app': {
    id: 'ovo-1',
    bankName: 'OVO',
    packageName: 'id.ovo.app',
    titlePattern: /OVO|Transaksi/i,
    textPattern: /Rp\.|IDR/i,
    amountPattern: /Rp\s*[\d.,]+|IDR\s*[\d.,]+/gi,
    typeExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('topup') || text.includes('masuk')) {
        return 'income';
      }
      return 'expense';
    },
    categoryExtractor: (notif) => {
      const text = `${notif.title || ''} ${notif.text || ''}`.toLowerCase();
      if (text.includes('bayar')) return 'shopping';
      if (text.includes('transfer')) return 'other';
      return 'other';
    },
    version: 1,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  // GCash (Philippines, tapi termasuk)
  'com.globe.gcash': {
    id: 'gcash-1',
    bankName: 'GCash',
    packageName: 'com.globe.gcash',
    titlePattern: /GCash|Wallet/i,
    textPattern: /₱|PHP/i,
    amountPattern: /₱\s*[\d.,]+|PHP\s*[\d.,]+/gi,
    typeExtractor: () => 'expense',
    categoryExtractor: () => 'other',
    version: 1,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
};

/**
 * Financial Parser Service
 */
export class FinancialParser {
  private static rules: Map<string, ParserRule> = new Map();
  private static initialized = false;

  /**
   * Initialize dengan default rules
   */
  static initialize() {
    if (this.initialized) {
      return;
    }

    Object.values(DEFAULT_PARSER_RULES).forEach(rule => {
      this.rules.set(rule.packageName, rule);
    });

    this.initialized = true;
  }

  /**
   * Register atau update parser rule
   */
  static registerRule(rule: ParserRule) {
    this.rules.set(rule.packageName, rule);
  }

  /**
   * Parse notifikasi menjadi transaksi
   */
  static parse(notification: NotificationLog): ParseResult {
    this.initialize();

    const rule = this.rules.get(notification.packageName);

    if (!rule || !rule.enabled) {
      return {
        success: false,
        confidence: 0,
        error: `No parser rule found for ${notification.packageName}`,
      };
    }

    try {
      // Check if notification matches title/text pattern
      if (rule.titlePattern) {
        const title = notification.title || '';
        if (!rule.titlePattern.test(title)) {
          return {
            success: false,
            confidence: 0,
            ruleName: rule.id,
            error: 'Notification title does not match pattern',
          };
        }
      }

      if (rule.textPattern) {
        const text = `${notification.text || ''} ${notification.bigText || ''}`;
        if (!rule.textPattern.test(text)) {
          return {
            success: false,
            confidence: 0,
            ruleName: rule.id,
            error: 'Notification text does not match pattern',
          };
        }
      }

      // Extract amount
      const amountMatch = this.extractAmount(notification, rule);
      if (!amountMatch) {
        return {
          success: false,
          confidence: 0,
          ruleName: rule.id,
          error: 'Could not extract amount from notification',
        };
      }

      // Extract type
      const type = rule.typeExtractor(notification);

      // Extract category
      const category = rule.categoryExtractor
        ? rule.categoryExtractor(notification)
        : 'other';

      // Extract merchant
      const merchant = this.extractMerchant(notification);

      // Extract reference
      const reference = this.extractReference(notification);

      // Exclude OTP, login, promo notifikasi
      if (this.isExcludedNotification(notification)) {
        return {
          success: false,
          confidence: 0,
          ruleName: rule.id,
          error: 'Notification is OTP, login, or promo - excluded',
        };
      }

      const transaction: FinancialTransaction = {
        id: uuid.v4() as string,
        sourceType: 'auto',
        sourceApp: rule.bankName,
        sourcePackageName: notification.packageName,
        rawNotificationId: notification.id,

        type,
        status: 'completed',
        category: category as TransactionCategory,

        amount: amountMatch,
        currency: 'IDR',

        description: `${notification.title || ''} - ${notification.text || ''}`.trim(),
        merchant,
        reference,

        date: notification.postTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),

        parserConfidence: 85, // Confidence score (0-100)
        parserRuleName: rule.id,
        parserVersion: '1.0',

        syncStatus: 'pending',
        isDuplicate: false,
        isEdited: false,
        isHidden: false,
        isVerified: false,
      };

      return {
        success: true,
        transaction,
        confidence: 85,
        ruleName: rule.id,
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        ruleName: rule.id,
        error: `Parser error: ${error}`,
      };
    }
  }

  /**
   * Extract nominal dari notifikasi
   */
  private static extractAmount(notification: NotificationLog, rule: ParserRule): number | null {
    const text = `${notification.title || ''} ${notification.text || ''} ${notification.bigText || ''}`;
    const matches = text.match(rule.amountPattern);

    if (!matches || matches.length === 0) {
      return null;
    }

    // Ambil nominal terbesar (biasanya nominal transaksi)
    const amounts = matches
      .map(m => this.parseAmount(m))
      .filter((a): a is number => a !== null)
      .sort((a, b) => b - a);

    return amounts.length > 0 ? amounts[0] : null;
  }

  /**
   * Parse string nominal ke number
   */
  private static parseAmount(amountStr: string): number | null {
    // Remove currency symbols
    let cleaned = amountStr.replace(/[Rp$₱]/g, '').trim();

    // Handle format 1.000.000 (dots as thousands separator)
    if (cleaned.includes('.') && !cleaned.includes(',')) {
      // Ambil bagian terakhir setelah dot terakhir
      const parts = cleaned.split('.');
      if (parts[parts.length - 1].length <= 2) {
        // Format 1.000,00
        cleaned = cleaned.replace(/\./g, '');
      } else if (parts.length > 1 && parts[parts.length - 1].length === 3) {
        // Format 1.000.000
        cleaned = cleaned.replace(/\./g, '');
      }
    }

    // Handle format dengan comma
    cleaned = cleaned.replace(/,/g, '');

    const amount = parseInt(cleaned, 10);
    return isNaN(amount) ? null : amount;
  }

  /**
   * Extract merchant name
   */
  private static extractMerchant(notification: NotificationLog): string | undefined {
    const text = `${notification.title || ''} ${notification.text || ''}`;

    // Common patterns
    const patterns = [/to:\s*(.+?)(?:\s|$|Rp)/i, /dari:\s*(.+?)(?:\s|$|Rp)/i, /kepada:\s*(.+?)(?:\s|$|Rp)/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract reference/transaction ID
   */
  private static extractReference(notification: NotificationLog): string | undefined {
    const text = `${notification.title || ''} ${notification.text || ''} ${notification.bigText || ''}`;

    // Carilah pattern nomor referensi
    const patterns = [/ref(?:erence)?[\s:]*([A-Z0-9]+)/i, /id[\s:]*([A-Z0-9]+)/i, /no[\s:]*([0-9]+)/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Exclude notifikasi yang bukan transaksi keuangan
   */
  private static isExcludedNotification(notification: NotificationLog): boolean {
    const text = `${notification.title || ''} ${notification.text || ''} ${notification.bigText || ''}`.toLowerCase();

    // OTP patterns
    if (/otp|kode verifikasi|verification code|kode keamanan/.test(text)) {
      return true;
    }

    // Login patterns
    if (/login|masuk|berhasil login|login berhasil/.test(text)) {
      return true;
    }

    // Promo/marketing patterns
    if (/promo|diskon|penawaran|gratis ongkir|cashback/.test(text)) {
      return true;
    }

    // Account notification patterns
    if (/perubahan sandi|update profile|aktivasi|notifikasi keamanan/.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Batch parse multiple notifications
   */
  static parseBatch(notifications: NotificationLog[]): ParseResult[] {
    return notifications.map(notif => this.parse(notif));
  }

  /**
   * Get all registered rules
   */
  static getAllRules(): ParserRule[] {
    this.initialize();
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by package name
   */
  static getRuleByPackage(packageName: string): ParserRule | undefined {
    this.initialize();
    return this.rules.get(packageName);
  }
};
