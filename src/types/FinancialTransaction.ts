/**
 * Core Financial Domain Models
 * Tipe-tipe untuk transaksi keuangan yang diparsing dari notifikasi
 */

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type TransactionCategory =
  | 'salary'
  | 'bonus'
  | 'freelance'
  | 'investment'
  | 'food'
  | 'transport'
  | 'shopping'
  | 'utilities'
  | 'entertainment'
  | 'healthcare'
  | 'education'
  | 'subscription'
  | 'other';

export type TransactionSource = 'auto' | 'manual';
export type SyncStatus = 'pending' | 'synced' | 'failed';

/**
 * Struktur utama transaksi keuangan
 */
export type FinancialTransaction = {
  // Identifikasi
  id: string; // UUID, generated locally
  
  // Metadata Sumber
  sourceType: TransactionSource; // Dari notifikasi atau manual
  sourceApp?: string; // Nama app bank/e-wallet (misal: BCA, BRI, DANA)
  sourcePackageName?: string; // Android package name
  rawNotificationId?: string; // ID notifikasi original untuk deduplication
  
  // Data Transaksi
  type: TransactionType;
  status: TransactionStatus;
  category: TransactionCategory;
  
  // Nominal
  amount: number; // Dalam IDR atau currency tertentu
  currency: string; // Default: IDR
  
  // Deskripsi
  description: string; // Teks transaksi dari notifikasi atau input manual
  merchant?: string; // Pihak penerima/pengirim
  reference?: string; // Nomor referensi atau transaction ID dari bank
  
  // Timestamp
  date: number; // Unix timestamp kapan transaksi terjadi (bukan kapan notifikasi masuk)
  createdAt: number; // Kapan record dibuat
  updatedAt: number; // Kapan terakhir diupdate
  
  // Metadata Parser
  parserConfidence?: number; // 0-100, tingkat kepercayaan parser
  parserRuleName?: string; // Rule parser yang dipakai
  parserVersion?: string; // Versi parser saat parsing
  
  // Sync Status (untuk future backend sync)
  syncStatus: SyncStatus;
  remoteId?: string; // ID di server setelah sync
  
  // Flags
  isDuplicate?: boolean; // Sudah dideteksi duplikat
  isEdited?: boolean; // User sudah edit
  isHidden?: boolean; // User menyembunyikan transaksi ini
  isVerified?: boolean; // User confirm transaksi benar
};

/**
 * Struktur untuk Tagihan Jatuh Tempo
 */
export type DueDate = {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  dueDate: number; // Unix timestamp
  category: TransactionCategory;
  
  // Repeat
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly'; // Jika recurring
  recurringEndDate?: number; // Kapan recurring berhenti, null = forever
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  
  // Status
  isPaid?: boolean;
  paidDate?: number;
  
  // Reminder
  reminderDaysBefore?: number; // Ingatkan N hari sebelum due date
  isReminderSent?: boolean;

  // Installment / cicilan
  installmentIndex?: number;
  installmentTotal?: number;
  parentInstallmentId?: string;
};

/**
 * Struktur untuk Budget/Limit per kategori
 */
export type BudgetLimit = {
  id: string;
  category: TransactionCategory;
  monthlyLimit: number;
  currency: string;
  
  // Period
  periodStartDate: number; // Unix timestamp bulan dimulai
  periodEndDate: number;
  
  // Alert
  alertThreshold?: number; // Ingatkan ketika mencapai persentase (0-100)
  
  createdAt: number;
  updatedAt: number;
};

/**
 * Financial Summary untuk Dashboard
 */
export type FinancialSummary = {
  // Period
  period: 'today' | 'week' | 'month' | 'all';
  startDate: number;
  endDate: number;
  
  // Total
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  
  // By Category
  expenseByCategory: Record<TransactionCategory, number>;
  incomeByCategory: Record<TransactionCategory, number>;
  
  // Transaction Count
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  
  // Top Categories
  topExpenseCategories: Array<{category: TransactionCategory; amount: number}>;
  topIncomeCategories: Array<{category: TransactionCategory; amount: number}>;
  
  // Cashflow
  dailyCashflow: Array<{date: string; income: number; expense: number; net: number}>;
};

/**
 * Parser Configuration
 */
export type ParserRule = {
  id: string;
  bankName: string; // BCA, BRI, DANA, OVO, etc
  packageName: string;
  
  // Pattern matching
  titlePattern?: RegExp;
  textPattern?: RegExp;
  
  // Extraction rules
  amountPattern: RegExp; // Pattern untuk extract nominal
  typeExtractor: (notification: {title?: string; text?: string; bigText?: string}) => TransactionType;
  categoryExtractor?: (notification: any) => TransactionCategory;
  merchantExtractor?: (notification: any) => string;
  
  // Metadata
  version: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

/**
 * Notification Raw Log (untuk debug dan parser testing)
 */
export type NotificationRawLog = {
  id: string;
  packageName: string;
  title?: string;
  text?: string;
  bigText?: string;
  subText?: string;
  
  notificationId?: number;
  tag?: string;
  postTime: number;
  receivedAt: number;
  
  // Parser attempt
  parserAttempted: boolean;
  parserResult?: FinancialTransaction | null;
  parserError?: string;
  
  // Keep for audit trail
  archivedAt?: number;
};
