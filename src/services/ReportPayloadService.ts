import {FinancialStorage} from '../storage/FinancialStorage';
import type {
  DueDate,
  FinancialSummary,
  FinancialTransaction,
  TransactionCategory,
  TransactionType,
} from '../types/FinancialTransaction';

export type ReportPeriodType = 'today' | 'week' | 'month' | 'all';
export type ExportFormat = 'excel' | 'pdf';

type Period = {
  type: ReportPeriodType;
  startDate: number;
  endDate: number;
};

type CategorySummaryItem = {
  category: TransactionCategory;
  type: 'income' | 'expense';
  amount: number;
  count: number;
};

export type ReportPayload = {
  report: {
    title: string;
    format: ExportFormat;
    timezone: string;
    locale: string;
    currency: string;
    generatedAt: number;
  };
  period: Period;
  filters: {
    transactionTypes: TransactionType[];
    categories: TransactionCategory[];
    sourceTypes: Array<'manual' | 'auto'>;
    includeHidden: boolean;
    includePending: boolean;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    transactionCount: number;
    incomeCount: number;
    expenseCount: number;
    transferCount: number;
  };
  transactions: FinancialTransaction[];
  categorySummary: CategorySummaryItem[];
  options: {
    includeSummary: boolean;
    includeCategoryBreakdown: boolean;
    includeRawSource: boolean;
    includeBillsOrGoals: boolean;
  };
  email?: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    message: string;
    replyTo: string;
    raw: {
      requestedBy: string;
      requestId: string;
      notes: string;
    };
  };
};

export type AiAnalysisPayload = Omit<ReportPayload, 'report' | 'options' | 'email'> & {
  prompt: string;
  report: {
    title: string;
    timezone: string;
    locale: string;
    currency: string;
    generatedAt: number;
  };
  goals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    dueDate: number;
  }>;
  bills: Array<{
    name: string;
    amount: number;
    dueDate: number;
    status: 'paid' | 'pending';
  }>;
  temperature: number;
  options: {
    num_predict: number;
  };
};

export function buildReportPayloadFromTransactions({
  transactions,
  periodType,
  format,
  title,
  emailTo,
}: {
  transactions: FinancialTransaction[];
  periodType: ReportPeriodType;
  format: ExportFormat;
  title?: string;
  emailTo?: string[];
}): ReportPayload {
  const now = Date.now();
  const visibleTransactions = transactions.filter(item => !item.isHidden);
  const period = buildPeriod(periodType, visibleTransactions);
  const summary = summarizeTransactions(visibleTransactions);
  const reportTitle = title ?? `Laporan Transaksi ${formatPeriodLabel(period)}`;

  return {
    report: {
      title: reportTitle,
      format,
      timezone: 'Asia/Jakarta',
      locale: 'id-ID',
      currency: 'IDR',
      generatedAt: now,
    },
    period,
    filters: {
      transactionTypes: ['income', 'expense', 'transfer'],
      categories: [],
      sourceTypes: ['manual', 'auto'],
      includeHidden: false,
      includePending: true,
    },
    summary,
    transactions: visibleTransactions,
    categorySummary: buildCategorySummary(visibleTransactions),
    options: {
      includeSummary: true,
      includeCategoryBreakdown: true,
      includeRawSource: true,
      includeBillsOrGoals: false,
    },
    email: {
      to: emailTo && emailTo.length > 0 ? emailTo : ['oviekshgy@gmail.com'],
      cc: [],
      bcc: [],
      subject: reportTitle,
      message: `Berikut kami lampirkan laporan transaksi periode ${formatPeriodLabel(period)}.`,
      replyTo: '',
      raw: {
        requestedBy: 'Frontend',
        requestId: `export-${now}`,
        notes: 'File laporan dibuat dari data yang dikirim frontend.',
      },
    },
  };
}

export async function buildAiAnalysisPayload({
  periodType,
  prompt,
}: {
  periodType: ReportPeriodType;
  prompt: string;
}): Promise<AiAnalysisPayload> {
  const summary = await FinancialStorage.calculateFinancialSummary(periodType);
  const transactions = await FinancialStorage.getTransactionsByDateRange(
    summary.startDate,
    summary.endDate,
  );
  const dueDates = await FinancialStorage.getAllDueDates();
  const now = Date.now();
  const basePayload = buildReportPayloadFromSummaryAndTransactions({
    summary,
    transactions,
    periodType,
    title: `Analisis Keuangan ${formatPeriodLabel({
      type: periodType,
      startDate: summary.startDate,
      endDate: summary.endDate,
    })}`,
  });

  return {
    prompt,
    report: {
      title: basePayload.report.title,
      timezone: basePayload.report.timezone,
      locale: basePayload.report.locale,
      currency: basePayload.report.currency,
      generatedAt: now,
    },
    period: basePayload.period,
    filters: basePayload.filters,
    summary: basePayload.summary,
    transactions: basePayload.transactions,
    categorySummary: basePayload.categorySummary,
    goals: dueDates.map(mapDueDateToGoal),
    bills: dueDates.map(mapDueDateToBill),
    temperature: 0.2,
    options: {
      num_predict: 700,
    },
  };
}

function buildReportPayloadFromSummaryAndTransactions({
  summary,
  transactions,
  periodType,
  title,
}: {
  summary: FinancialSummary;
  transactions: FinancialTransaction[];
  periodType: ReportPeriodType;
  title: string;
}): ReportPayload {
  const now = Date.now();
  return {
    report: {
      title,
      format: 'excel',
      timezone: 'Asia/Jakarta',
      locale: 'id-ID',
      currency: 'IDR',
      generatedAt: now,
    },
    period: {
      type: periodType,
      startDate: summary.startDate,
      endDate: summary.endDate,
    },
    filters: {
      transactionTypes: ['income', 'expense', 'transfer'],
      categories: [],
      sourceTypes: ['manual', 'auto'],
      includeHidden: false,
      includePending: true,
    },
    summary: {
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      netCashFlow: summary.netCashFlow,
      transactionCount: summary.transactionCount,
      incomeCount: summary.incomeCount,
      expenseCount: summary.expenseCount,
      transferCount: transactions.filter(item => item.type === 'transfer').length,
    },
    transactions: transactions.filter(item => !item.isHidden),
    categorySummary: buildCategorySummary(transactions),
    options: {
      includeSummary: true,
      includeCategoryBreakdown: true,
      includeRawSource: true,
      includeBillsOrGoals: false,
    },
  };
}

function buildPeriod(periodType: ReportPeriodType, transactions: FinancialTransaction[]): Period {
  if (transactions.length === 0) {
    const summaryRange = fallbackPeriodRange(periodType);
    return {
      type: periodType,
      startDate: summaryRange.startDate,
      endDate: summaryRange.endDate,
    };
  }

  return {
    type: periodType,
    startDate: Math.min(...transactions.map(item => item.date)),
    endDate: Math.max(...transactions.map(item => item.date)),
  };
}

function fallbackPeriodRange(periodType: ReportPeriodType): {startDate: number; endDate: number} {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (periodType === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {startDate: today.getTime(), endDate: now};
  }
  if (periodType === 'week') {
    return {startDate: now - 7 * dayMs, endDate: now};
  }
  if (periodType === 'month') {
    return {startDate: now - 30 * dayMs, endDate: now};
  }
  return {startDate: 0, endDate: now};
}

function summarizeTransactions(transactions: FinancialTransaction[]): ReportPayload['summary'] {
  return transactions.reduce(
    (summary, item) => {
      if (item.type === 'income') {
        summary.totalIncome += item.amount;
        summary.incomeCount += 1;
      } else if (item.type === 'expense') {
        summary.totalExpense += item.amount;
        summary.expenseCount += 1;
      } else if (item.type === 'transfer') {
        summary.transferCount += 1;
      }
      summary.transactionCount += 1;
      summary.netCashFlow = summary.totalIncome - summary.totalExpense;
      return summary;
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      netCashFlow: 0,
      transactionCount: 0,
      incomeCount: 0,
      expenseCount: 0,
      transferCount: 0,
    },
  );
}

function buildCategorySummary(transactions: FinancialTransaction[]): CategorySummaryItem[] {
  const grouped = new Map<string, CategorySummaryItem>();
  transactions.forEach(item => {
    if (item.type === 'transfer') {
      return;
    }
    const key = `${item.type}:${item.category}`;
    const current = grouped.get(key);
    grouped.set(key, {
      category: item.category,
      type: item.type,
      amount: (current?.amount ?? 0) + item.amount,
      count: (current?.count ?? 0) + 1,
    });
  });
  return [...grouped.values()].sort((a, b) => b.amount - a.amount);
}

function mapDueDateToGoal(item: DueDate) {
  return {
    name: item.title,
    targetAmount: item.amount,
    currentAmount: item.isPaid ? item.amount : 0,
    dueDate: item.dueDate,
  };
}

function mapDueDateToBill(item: DueDate) {
  return {
    name: item.title,
    amount: item.amount,
    dueDate: item.dueDate,
    status: item.isPaid ? 'paid' as const : 'pending' as const,
  };
}

function formatPeriodLabel(period: Period): string {
  if (period.type === 'today') {
    return 'Hari Ini';
  }
  if (period.type === 'week') {
    return '7 Hari Terakhir';
  }
  if (period.type === 'all') {
    return 'Semua Periode';
  }
  return new Date(period.endDate).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}
