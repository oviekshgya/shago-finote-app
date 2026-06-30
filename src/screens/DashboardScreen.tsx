import React, {useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {FinancialSummary, TransactionCategory} from '../types/FinancialTransaction';
import {useFinancialSummary} from '../hooks/useTransactions';
import {formatCurrency} from '../utils/TransactionUtils';
import {colors, radii, shadow} from '../theme/finoteTheme';

const monthlyBudget = 5000000;
const goalTarget = 12000000;

export default function DashboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const {summary, loading, refresh} = useFinancialSummary(period);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  }, [refresh]);

  const budgetUsed = summary ? Math.min(summary.totalExpense / monthlyBudget, 1) : 0;
  const savedAmount = summary ? Math.max(summary.netCashFlow, 0) : 0;
  const goalProgress = Math.min(savedAmount / goalTarget, 1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingTop: Math.max(insets.top, 18) + 8},
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Shago Finote</Text>
            <Text style={styles.title}>Home</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={onRefresh}>
            <Text style={styles.profileText}>SF</Text>
          </Pressable>
        </View>

        <PeriodSelector value={period} onChange={setPeriod} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : summary ? (
          <>
            <BalanceCard summary={summary} budgetUsed={budgetUsed} />

            <SectionHeader title="Insights" action="This month" />
            <View style={styles.insightGrid}>
              <InsightCard
                title="Income"
                amount={summary.totalIncome}
                helper={`${summary.incomeCount} transaksi masuk`}
                tone="teal"
              />
              <InsightCard
                title="Expense"
                amount={summary.totalExpense}
                helper={`${summary.expenseCount} transaksi keluar`}
                tone="pink"
              />
            </View>

            <SpendingOverview summary={summary} budgetUsed={budgetUsed} />

            <SectionHeader title="Goals" action={`${Math.round(goalProgress * 100)}%`} />
            <GoalCard
              title="Emergency Fund"
              target={goalTarget}
              current={savedAmount}
              progress={goalProgress}
            />

            <SaveCard balance={savedAmount} />

            <RecentCategories categories={summary.topExpenseCategories} />
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada data keuangan</Text>
            <Text style={styles.emptyText}>
              Catat transaksi pertama untuk mulai melihat insight dan progress budget.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Add')}>
              <Text style={styles.primaryButtonText}>Tambah Transaksi</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: 'today' | 'week' | 'month' | 'all';
  onChange(value: 'today' | 'week' | 'month' | 'all'): void;
}) {
  const items: Array<{value: typeof value; label: string}> = [
    {value: 'today', label: 'Today'},
    {value: 'week', label: 'Week'},
    {value: 'month', label: 'Month'},
    {value: 'all', label: 'All'},
  ];

  return (
    <View style={styles.segment}>
      {items.map(item => (
        <Pressable
          key={item.value}
          style={[styles.segmentButton, value === item.value && styles.segmentButtonActive]}
          onPress={() => onChange(item.value)}>
          <Text
            style={[
              styles.segmentText,
              value === item.value && styles.segmentTextActive,
            ]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function BalanceCard({
  summary,
  budgetUsed,
}: {
  summary: FinancialSummary;
  budgetUsed: number;
}) {
  const balance = summary.netCashFlow;
  const paydayDate = new Date();
  paydayDate.setMonth(paydayDate.getMonth() + 1, 25);
  const daysToPayday = Math.max(
    0,
    Math.ceil((paydayDate.getTime() - Date.now()) / 86400000),
  );

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceTop}>
        <View>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
        </View>
        <View style={styles.rankPill}>
          <Text style={styles.rankText}>Rank 8</Text>
        </View>
      </View>

      <View style={styles.balanceStats}>
        <MiniStat label="Spending" value={formatCurrency(summary.totalExpense)} tone="pink" />
        <MiniStat label="Saving" value={formatCurrency(balance)} tone="teal" />
      </View>

      <View style={styles.paydayRow}>
        <View style={styles.paydayIcon}>
          <Text style={styles.paydayIconText}>P</Text>
        </View>
        <View style={styles.paydayTextWrap}>
          <Text style={styles.paydayTitle}>Payday countdown</Text>
          <Text style={styles.paydayText}>{daysToPayday} days left to next payday</Text>
        </View>
        <Text style={styles.paydayPercent}>{Math.round(budgetUsed * 100)}%</Text>
      </View>
    </View>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'pink' | 'teal';
}) {
  return (
    <View style={[styles.miniStat, tone === 'pink' ? styles.pinkSoft : styles.tealSoft]}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function InsightCard({
  title,
  amount,
  helper,
  tone,
}: {
  title: string;
  amount: number;
  helper: string;
  tone: 'teal' | 'pink';
}) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIcon, tone === 'teal' ? styles.tealSoft : styles.pinkSoft]}>
        <Text style={[styles.insightIconText, tone === 'teal' ? styles.tealText : styles.pinkText]}>
          {tone === 'teal' ? '+' : '-'}
        </Text>
      </View>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightAmount} numberOfLines={1}>{formatCurrency(amount)}</Text>
      <Text style={styles.insightHelper}>{helper}</Text>
    </View>
  );
}

function SpendingOverview({
  summary,
  budgetUsed,
}: {
  summary: FinancialSummary;
  budgetUsed: number;
}) {
  const top = summary.topExpenseCategories.slice(0, 4);
  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <View>
          <Text style={styles.cardTitle}>Spending overview</Text>
          <Text style={styles.cardSubtitle}>Budget progress by category</Text>
        </View>
        <Text style={styles.overviewAmount}>{formatCurrency(summary.totalExpense)}</Text>
      </View>
      <ProgressBar progress={budgetUsed} color={colors.primary} />
      <View style={styles.categoryList}>
        {top.length > 0 ? top.map(item => (
          <CategoryRow key={item.category} category={item.category} amount={item.amount} total={summary.totalExpense} />
        )) : (
          <Text style={styles.mutedText}>Belum ada pengeluaran pada periode ini.</Text>
        )}
      </View>
    </View>
  );
}

function GoalCard({
  title,
  target,
  current,
  progress,
}: {
  title: string;
  target: number;
  current: number;
  progress: number;
}) {
  const monthlyNeed = Math.max(Math.ceil((target - current) / 6), 0);
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalBadge}>
        <Text style={styles.goalBadgeText}>GO</Text>
      </View>
      <View style={styles.goalMain}>
        <Text style={styles.goalTitle}>{title}</Text>
        <Text style={styles.goalTarget}>Target {formatCurrency(target)}</Text>
        <ProgressBar progress={progress} color={colors.teal} />
        <View style={styles.goalFooter}>
          <Text style={styles.goalCurrent}>{formatCurrency(current)}</Text>
          <Text style={styles.goalNeed}>{formatCurrency(monthlyNeed)}/mo</Text>
        </View>
      </View>
    </View>
  );
}

function SaveCard({balance}: {balance: number}) {
  return (
    <View style={styles.saveCard}>
      <View>
        <Text style={styles.saveLabel}>VIP Save</Text>
        <Text style={styles.saveTitle}>Smart saving pocket</Text>
        <Text style={styles.saveText}>Estimate yield and separate money for goals.</Text>
      </View>
      <View style={styles.saveAmountWrap}>
        <Text style={styles.saveAmount}>{formatCurrency(balance)}</Text>
        <Text style={styles.saveRate}>4.2% p.a.</Text>
      </View>
    </View>
  );
}

function RecentCategories({
  categories,
}: {
  categories: Array<{category: TransactionCategory; amount: number}>;
}) {
  if (categories.length === 0) {
    return null;
  }
  return (
    <>
      <SectionHeader title="Recent spend" />
      <View style={styles.recentCard}>
        {categories.slice(0, 5).map(item => (
          <CategoryRow key={item.category} category={item.category} amount={item.amount} total={categories[0].amount} />
        ))}
      </View>
    </>
  );
}

function CategoryRow({
  category,
  amount,
  total,
}: {
  category: TransactionCategory;
  amount: number;
  total: number;
}) {
  const progress = total > 0 ? Math.min(amount / total, 1) : 0;
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryLeft}>
        <View style={styles.categoryDot}>
          <Text style={styles.categoryDotText}>{formatCategoryLabel(category).slice(0, 1)}</Text>
        </View>
        <View style={styles.categoryCopy}>
          <Text style={styles.categoryName}>{formatCategoryLabel(category)}</Text>
          <ProgressBar progress={progress} color={colors.orange} compact />
        </View>
      </View>
      <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
    </View>
  );
}

function SectionHeader({title, action}: {title: string; action?: string}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function ProgressBar({
  progress,
  color,
  compact,
}: {
  progress: number;
  color: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.progressTrack, compact && styles.progressTrackCompact]}>
      <View
        style={[
          styles.progressFill,
          compact && styles.progressFillCompact,
          {width: `${Math.max(4, Math.round(progress * 100))}%`, backgroundColor: color},
        ]}
      />
    </View>
  );
}

function formatCategoryLabel(category: TransactionCategory): string {
  const labels: Record<TransactionCategory, string> = {
    salary: 'Salary',
    bonus: 'Bonus',
    freelance: 'Freelance',
    investment: 'Investment',
    food: 'Groceries',
    transport: 'Transport',
    shopping: 'Shopping',
    utilities: 'Utilities',
    entertainment: 'Entertainment',
    healthcare: 'Health',
    education: 'Education',
    subscription: 'Subscription',
    other: 'Others',
  };
  return labels[category];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  profileText: {
    color: colors.primary,
    fontWeight: '900',
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.surface,
  },
  loadingContainer: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    borderRadius: radii.xl,
    padding: 18,
    backgroundColor: colors.primary,
    marginBottom: 16,
    ...shadow,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceLabel: {
    color: '#ddd5ff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  balanceAmount: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '900',
  },
  rankPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  balanceStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  miniStat: {
    flex: 1,
    borderRadius: radii.lg,
    padding: 12,
  },
  tealSoft: {
    backgroundColor: colors.tealSoft,
  },
  pinkSoft: {
    backgroundColor: colors.pinkSoft,
  },
  miniStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },
  miniStatValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  paydayRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    gap: 10,
  },
  paydayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paydayIconText: {
    color: colors.ink,
    fontWeight: '900',
  },
  paydayTextWrap: {
    flex: 1,
  },
  paydayTitle: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  paydayText: {
    color: '#e7e1ff',
    fontSize: 11,
    marginTop: 2,
  },
  paydayPercent: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  insightGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  insightCard: {
    flex: 1,
    minHeight: 142,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  insightIconText: {
    fontSize: 20,
    fontWeight: '900',
  },
  tealText: {
    color: colors.teal,
  },
  pinkText: {
    color: colors.pink,
  },
  insightTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  insightAmount: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
  insightHelper: {
    color: colors.faint,
    fontSize: 11,
    marginTop: 5,
  },
  overviewCard: {
    borderRadius: radii.xl,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadow,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  overviewAmount: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  progressTrackCompact: {
    height: 5,
    borderRadius: 3,
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
  },
  progressFillCompact: {
    height: 5,
    borderRadius: 3,
  },
  categoryList: {
    marginTop: 12,
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDotText: {
    color: colors.orange,
    fontWeight: '900',
  },
  categoryCopy: {
    flex: 1,
    gap: 6,
  },
  categoryName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  categoryAmount: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  mutedText: {
    color: colors.muted,
    fontSize: 12,
  },
  goalCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radii.xl,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  goalBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalBadgeText: {
    color: colors.teal,
    fontWeight: '900',
  },
  goalMain: {
    flex: 1,
  },
  goalTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  goalTarget: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
  },
  goalFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCurrent: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '900',
  },
  goalNeed: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  saveCard: {
    borderRadius: radii.xl,
    padding: 16,
    backgroundColor: colors.primaryDark,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  saveLabel: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: '900',
  },
  saveTitle: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
  saveText: {
    color: '#dad3ff',
    fontSize: 11,
    marginTop: 4,
    maxWidth: 170,
  },
  saveAmountWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  saveAmount: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  saveRate: {
    marginTop: 5,
    color: colors.teal,
    fontSize: 12,
    fontWeight: '900',
  },
  recentCard: {
    borderRadius: radii.xl,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  emptyCard: {
    marginTop: 40,
    borderRadius: radii.xl,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '900',
  },
});
