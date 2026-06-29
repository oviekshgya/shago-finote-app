/**
 * Dashboard Screen
 * Menampilkan ringkasan keuangan dan analytics
 */

import React, { useState } from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModernCard } from '../components/ModernCard';
import { ModernButton } from '../components/ModernButton';
import { colors, spacing, typography, borderRadius } from '../theme/spacing';
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
    <LinearGradient
      colors={colors.gradients.background}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[styles.container, { paddingTop: Math.max(insets.top, 0) }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💰 Keuangan Anda</Text>
          <Text style={styles.subtitle}>Ringkasan & analytics real-time</Text>
        </View>

        {/* Period Selector - Modern Pills */}
        <View style={styles.periodSelectorContainer}>
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodPill,
                period === p && styles.periodPillActive,
              ]}>
              <Text
                style={[
                  styles.periodPillText,
                  period === p && styles.periodPillTextActive,
                ]}>
                {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Semua'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : summary ? (
          <>
            {/* Main Summary Card - Large */}
            <ModernCard variant="elevated" padding={spacing.xl} margin={spacing.lg}>
              <View style={styles.mainSummaryCard}>
                <View>
                  <Text style={styles.mainSummaryLabel}>Net Cashflow</Text>
                  <Text
                    style={[
                      styles.mainSummaryAmount,
                      {
                        color:
                          summary.netCashFlow >= 0
                            ? colors.income
                            : colors.expense,
                      },
                    ]}>
                    {formatCurrency(summary.netCashFlow)}
                  </Text>
                </View>
                <View style={styles.mainSummaryBadge}>
                  <Text style={styles.mainSummaryBadgeText}>
                    {summary.netCashFlow >= 0 ? '📈' : '📉'}
                  </Text>
                </View>
              </View>
            </ModernCard>

            {/* Summary Grid - Income & Expense */}
            <View style={styles.summaryGrid}>
              <ModernCard variant="gradient" padding={spacing.lg}>
                <View style={styles.summaryCardContent}>
                  <Text style={styles.summaryCardLabel}>Pemasukan</Text>
                  <Text style={[styles.summaryCardAmount, {color: colors.income}]}>
                    {formatCurrency(summary.totalIncome)}
                  </Text>
                  <Text style={styles.summaryCardCount}>
                    {summary.incomeCount} transaksi
                  </Text>
                </View>
              </ModernCard>
              <ModernCard variant="gradient" padding={spacing.lg}>
                <View style={styles.summaryCardContent}>
                  <Text style={styles.summaryCardLabel}>Pengeluaran</Text>
                  <Text style={[styles.summaryCardAmount, {color: colors.expense}]}>
                    {formatCurrency(summary.totalExpense)}
                  </Text>
                  <Text style={styles.summaryCardCount}>
                    {summary.expenseCount} transaksi
                  </Text>
                </View>
              </ModernCard>
            </View>

            {/* Chart Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Grafik Keuangan</Text>
              <ModernCard variant="default" padding={spacing.lg}>
                <CashflowChart data={summary.dailyCashflow} />
              </ModernCard>
            </View>

            {/* Top Categories */}
            {summary.topExpenseCategories.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Pengeluaran Terbesar</Text>
                <ModernCard variant="default" padding={0}>
                  {summary.topExpenseCategories.map((cat, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.categoryRow,
                        idx !== summary.topExpenseCategories.length - 1 &&
                          styles.categoryRowBorder,
                      ]}>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryEmoji}>
                          {getCategoryEmoji(cat.category)}
                        </Text>
                        <Text style={styles.categoryName}>
                          {formatCategoryLabel(cat.category)}
                        </Text>
                      </View>
                      <Text style={styles.categoryAmount}>
                        {formatCurrency(cat.amount)}
                      </Text>
                    </View>
                  ))}
                </ModernCard>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>Tidak ada data keuangan</Text>
            <Text style={styles.emptyDesc}>
              Mulai catat transaksi untuk melihat ringkasan
            </Text>
            <ModernButton
              label="Refresh"
              onPress={onRefresh}
              variant="primary"
              size="lg"
              style={{marginTop: spacing.lg}}
            />
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// Helper function for category emoji
function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    salary: '💼',
    bonus: '🎁',
    freelance: '👨‍💻',
    food: '🍔',
    transport: '🚗',
    shopping: '🛍️',
    utilities: '💡',
    entertainment: '🎬',
    healthcare: '🏥',
    education: '📚',
    subscription: '📱',
    investment: '📈',
    other: '📌',
  };
  return emojis[category] || '💰';
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
    <View>
      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const incomeHeight = Math.max(6, (item.income / maxValue) * 100);
          const expenseHeight = Math.max(6, (item.expense / maxValue) * 100);
          const date = item.date ? new Date(item.date) : null;
          return (
            <View key={`${item.date}-${index}`} style={styles.chartColumn}>
              <View style={styles.chartBars}>
                <View
                  style={[styles.chartBar, styles.incomeBar, {height: incomeHeight}]}
                />
                <View
                  style={[styles.chartBar, styles.expenseBar, {height: expenseHeight}]}
                />
              </View>
              <Text style={styles.chartLabel}>
                {date ? date.getDate().toString() : '-'}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: colors.income}]} />
          <Text style={styles.legendText}>Pemasukan</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: colors.expense}]} />
          <Text style={styles.legendText}>Pengeluaran</Text>
        </View>
      </View>
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
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.label,
    color: colors.textTertiary,
  },
  periodSelectorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    gap: spacing.md,
  },
  periodPill: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  periodPillActive: {
    backgroundColor: colors.primary,
  },
  periodPillText: {
    fontSize: typography.label,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodPillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainSummaryLabel: {
    fontSize: typography.label,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  mainSummaryAmount: {
    fontSize: typography.h2,
    fontWeight: '800',
  },
  mainSummaryBadge: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSummaryBadgeText: {
    fontSize: 32,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryCardLabel: {
    fontSize: typography.label,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  summaryCardAmount: {
    fontSize: typography.h3,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  summaryCardCount: {
    fontSize: typography.small,
    color: colors.textTertiary,
  },
  sectionContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartContainer: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBars: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  chartBar: {
    width: 5,
    borderRadius: borderRadius.sm,
  },
  incomeBar: {
    backgroundColor: colors.income,
  },
  expenseBar: {
    backgroundColor: colors.expense,
  },
  chartLabel: {
    marginTop: spacing.md,
    fontSize: typography.tiny,
    color: colors.textTertiary,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: spacing.xl,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  legendText: {
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  categoryAmount: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.expense,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: typography.h4,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
