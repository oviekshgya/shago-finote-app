/**
 * Dashboard Screen
 * Menampilkan ringkasan keuangan dan analytics
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FinancialSummary } from '../types/FinancialTransaction';
import { useFinancialSummary } from '../hooks/useTransactions';
import { formatCurrency } from '../utils/TransactionUtils';

export default function DashboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const { summary, loading, refresh } = useFinancialSummary(period);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  }, [refresh]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1c" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c9152a"
            colors={['#c9152a']}
          />
        }
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Ringkasan keuangan Anda</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelectorContainer}>
          <View style={styles.periodSelector}>
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <Pressable
                key={p}
                style={[styles.periodButton, period === p && styles.periodButtonActive]}
                onPress={() => setPeriod(p)}>
                <Text
                  style={[
                    styles.periodButtonText,
                    period === p && styles.periodButtonTextActive,
                  ]}>
                  {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Semua'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#c9152a" size="large" />
          </View>
        ) : summary ? (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <SummaryCard
                title="Total Pemasukan"
                amount={summary.totalIncome}
                type="income"
              />
              <SummaryCard
                title="Total Pengeluaran"
                amount={summary.totalExpense}
                type="expense"
              />
              <SummaryCard
                title="Net Cashflow"
                amount={summary.netCashFlow}
                type="net"
              />
              <SummaryMetric
                title="Total Transaksi"
                value={summary.transactionCount.toString()}
              />
            </View>

            <CashflowChart data={summary.dailyCashflow} />

            {/* Top Categories */}
            {summary.topExpenseCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pengeluaran Terbesar</Text>
                {summary.topExpenseCategories.map((cat, idx) => (
                  <View key={idx} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{formatCategoryLabel(cat.category)}</Text>
                    <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Transaction Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ringkasan Transaksi</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Total" value={summary.transactionCount.toString()} />
                <StatCard label="Pemasukan" value={summary.incomeCount.toString()} />
                <StatCard label="Pengeluaran" value={summary.expenseCount.toString()} />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada data keuangan</Text>
            <Pressable style={styles.emptyButton} onPress={onRefresh}>
              <Text style={styles.emptyButtonText}>Refresh</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  title,
  amount,
  type,
}: {
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'net';
}) {
  const backgroundColor =
    type === 'income' ? '#1a4d2e' : type === 'expense' ? '#5a1a1a' : '#2a2a2e';
  const textColor = type === 'income' ? '#4ade80' : type === 'expense' ? '#f87171' : '#e5e7eb';

  return (
    <View style={[styles.summaryCard, { backgroundColor }]}>
      <Text style={styles.summaryCardTitle}>{title}</Text>
      <Text style={[styles.summaryCardAmount, { color: textColor }]}>
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

function SummaryMetric({title, value}: {title: string; value: string}) {
  return (
    <View style={[styles.summaryCard, styles.metricCard]}>
      <Text style={styles.summaryCardTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function CashflowChart({
  data,
}: {
  data: Array<{date: string; income: number; expense: number; net: number}>;
}) {
  const chartData = data.length > 0 ? data : [{date: '', income: 0, expense: 0, net: 0}];
  const maxValue = Math.max(
    1,
    ...chartData.map(item => Math.max(item.income, item.expense)),
  );

  return (
    <View style={styles.chartSection}>
      <View style={styles.chartHeader}>
        <Text style={styles.sectionTitle}>Grafik Keuangan</Text>
        <Text style={styles.chartHint}>14 hari terakhir</Text>
      </View>
      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const incomeHeight = Math.max(4, (item.income / maxValue) * 92);
          const expenseHeight = Math.max(4, (item.expense / maxValue) * 92);
          const date = item.date ? new Date(item.date) : null;
          return (
            <View key={`${item.date}-${index}`} style={styles.chartColumn}>
              <View style={styles.chartBars}>
                <View style={[styles.chartBar, styles.incomeBar, {height: incomeHeight}]} />
                <View style={[styles.chartBar, styles.expenseBar, {height: expenseHeight}]} />
              </View>
              <Text style={styles.chartLabel}>
                {date ? date.getDate().toString() : '-'}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: '#22c55e'}]} />
          <Text style={styles.legendText}>Pemasukan</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: '#ef4444'}]} />
          <Text style={styles.legendText}>Pengeluaran</Text>
        </View>
      </View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    salary: 'Gaji',
    bonus: 'Bonus',
    freelance: 'Freelance',
    food: 'Makanan',
    transport: 'Transportasi',
    shopping: 'Belanja',
    utilities: 'Utilitas',
    entertainment: 'Hiburan',
    healthcare: 'Kesehatan',
    education: 'Pendidikan',
    subscription: 'Langganan',
    investment: 'Investasi',
    other: 'Lainnya',
  };
  return labels[category] || category;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111113',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  periodSelectorContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2c',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  periodButtonActive: {
    backgroundColor: '#c9152a',
    borderColor: '#c9152a',
  },
  periodButtonText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  periodButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  summaryCard: {
    width: '48.5%',
    minHeight: 92,
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: '#2a2a2e',
  },
  summaryCardTitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryCardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  metricCard: {
    backgroundColor: '#20242d',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  chartSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 9,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartHint: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chartContainer: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    paddingTop: 8,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBars: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  chartBar: {
    width: 4,
    borderRadius: 2,
  },
  incomeBar: {
    backgroundColor: '#22c55e',
  },
  expenseBar: {
    backgroundColor: '#ef4444',
  },
  chartLabel: {
    marginTop: 6,
    fontSize: 10,
    color: '#9ca3af',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    color: '#d1d5db',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2c',
  },
  categoryName: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f87171',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a2c',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9b8c86',
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#c9152a',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
