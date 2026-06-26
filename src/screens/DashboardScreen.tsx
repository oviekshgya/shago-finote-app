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
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard Keuangan</Text>
          <Text style={styles.subtitle}>Ringkasan aktivitas finansial Anda</Text>
        </View>

        {/* Period Selector */}
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
            </View>

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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9b8c86',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2c',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  periodButtonActive: {
    backgroundColor: '#c9152a',
    borderColor: '#c9152a',
  },
  periodButtonText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9b8c86',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryGrid: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2a2a2e',
  },
  summaryCardTitle: {
    fontSize: 12,
    color: '#9b8c86',
    marginBottom: 8,
  },
  summaryCardAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2c',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9b8c86',
    marginBottom: 4,
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
