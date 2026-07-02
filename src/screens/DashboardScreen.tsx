import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {FinancialSummary, SavingsGoal, SummaryPeriodType, TransactionCategory} from '../types/FinancialTransaction';
import {useFinancialSummary} from '../hooks/useTransactions';
import {formatCurrency} from '../utils/TransactionUtils';
import {colors, radii, shadow} from '../theme/finoteTheme';
import {analyzeFinance, type AiAnalysisResult, type AiFinding} from '../services/BackendApi';
import {buildAiAnalysisPayload} from '../services/ReportPayloadService';
import {FinancialStorage} from '../storage/FinancialStorage';

const monthlyBudget = 5000000;
const dayMs = 24 * 60 * 60 * 1000;

type GoalProgress = {
  current: number;
  target: number;
};

export default function DashboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<SummaryPeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState(startOfDay(Date.now() - 6 * dayMs));
  const [customEndDate, setCustomEndDate] = useState(endOfDay(Date.now()));
  const {summary, loading, refresh} = useFinancialSummary(period, customStartDate, customEndDate);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [comparisonRangeModalVisible, setComparisonRangeModalVisible] = useState(false);
  const [comparisonCustom, setComparisonCustom] = useState(false);
  const [comparisonStartDate, setComparisonStartDate] = useState(startOfDay(Date.now() - dayMs));
  const [comparisonEndDate, setComparisonEndDate] = useState(endOfDay(Date.now() - dayMs));
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [allTimeSaving, setAllTimeSaving] = useState(0);
  const [goalProgressMap, setGoalProgressMap] = useState<Record<string, GoalProgress>>({});
  const [comparisonSummary, setComparisonSummary] = useState<FinancialSummary | null>(null);

  const loadGoalState = useCallback(async () => {
    const [storedGoals, allSummary] = await Promise.all([
      FinancialStorage.getAllGoals(),
      FinancialStorage.calculateFinancialSummary('all'),
    ]);
    const activeGoals = storedGoals
      .filter(goal => !goal.isArchived)
      .sort((a, b) => getGoalStartDate(a) - getGoalStartDate(b));
    const goalProgressEntries = await Promise.all(
      activeGoals.map(async goal => {
        const goalSummary = await FinancialStorage.calculateFinancialSummaryByRange(
          getGoalStartDate(goal),
          getGoalEndDate(goal),
          'customRange',
        );
        return [
          goal.id,
          {
            current: Math.max(goalSummary.netCashFlow, 0),
            target: goal.targetAmount,
          },
        ] as const;
      }),
    );
    setGoals(activeGoals);
    setGoalProgressMap(Object.fromEntries(goalProgressEntries));
    setAllTimeSaving(Math.max(allSummary.netCashFlow, 0));
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([refresh(), loadGoalState()]).finally(() => setRefreshing(false));
  }, [loadGoalState, refresh]);

  useEffect(() => {
    loadGoalState().catch(() => undefined);
  }, [loadGoalState, summary]);

  useFocusEffect(
    useCallback(() => {
      loadGoalState().catch(() => undefined);
    }, [loadGoalState]),
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('goalsUpdated', loadGoalState);
    return () => subscription.remove();
  }, [loadGoalState]);

  useEffect(() => {
    if (!summary) {
      setComparisonSummary(null);
      return;
    }
    const range = comparisonCustom
      ? {startDate: comparisonStartDate, endDate: comparisonEndDate}
      : buildComparisonRange(summary);
    if (!range) {
      setComparisonSummary(null);
      return;
    }
    FinancialStorage.calculateFinancialSummaryByRange(range.startDate, range.endDate, 'customRange')
      .then(setComparisonSummary)
      .catch(() => setComparisonSummary(null));
  }, [comparisonCustom, comparisonEndDate, comparisonStartDate, summary]);

  const handleAnalyzeAi = async () => {
    setAiModalVisible(true);
    setAiLoading(true);
    setAiError(null);
    try {
      const payload = await buildAiAnalysisPayload({
        periodType: period,
        startDate: period === 'customRange' ? customStartDate : undefined,
        endDate: period === 'customRange' ? customEndDate : undefined,
        prompt: 'Analisis apakah saya sudah hemat atau boros. Berikan saran agar pengeluaran saya lebih irit berdasarkan transaksi ini.',
      });
      const result = await analyzeFinance(payload);
      setAiResult(result);
    } catch (error) {
      setAiError(String(error));
    } finally {
      setAiLoading(false);
    }
  };

  const budgetUsed = summary ? Math.min(summary.totalExpense / monthlyBudget, 1) : 0;
  const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalGoalCurrent = goals.reduce(
    (sum, goal) => sum + Math.min(goalProgressMap[goal.id]?.current ?? 0, goal.targetAmount),
    0,
  );
  const goalProgress = totalGoalTarget > 0
    ? Math.min(totalGoalCurrent / totalGoalTarget, 1)
    : 0;

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

        <PeriodSelector
          value={period}
          rangeLabel={formatRangeShort(customStartDate, customEndDate)}
          onChange={setPeriod}
          onOpenRange={() => setRangeModalVisible(true)}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : summary ? (
          <>
            <BalanceCard summary={summary} />

            <SectionHeader title="Insights" action={formatPeriodAction(period)} />
            <ComparisonCard
              current={summary}
              previous={comparisonSummary}
              custom={comparisonCustom}
              onOpenRange={() => setComparisonRangeModalVisible(true)}
              onReset={() => setComparisonCustom(false)}
            />
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

            <SummaryChart summary={summary} />

            <SourceOverview sources={summary.sourceSummary} />

            <SpendingOverview summary={summary} budgetUsed={budgetUsed} />

            <SectionHeader title="Goals" action={`${Math.round(goalProgress * 100)}%`} />
            <GoalCard
              goals={goals}
              target={totalGoalTarget}
              currentAmount={totalGoalCurrent}
              progress={goalProgress}
              onPress={() => navigation.navigate('Bills')}
            />

            <SaveCard balance={allTimeSaving} />

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

      {summary ? (
        <>
          <Pressable
            style={[styles.aiFab, {bottom: Math.max(insets.bottom, 10) + 64}]}
            onPress={handleAnalyzeAi}>
            <Text style={styles.aiFabIcon}>AI</Text>
            <Text style={styles.aiFabText}>Analyze AI</Text>
          </Pressable>

          <AiAnalysisModal
            visible={aiModalVisible}
            summary={summary}
            budgetUsed={budgetUsed}
            loading={aiLoading}
            error={aiError}
            result={aiResult}
            onClose={() => setAiModalVisible(false)}
          />
        </>
      ) : null}
      <DateRangeModal
        visible={rangeModalVisible}
        title="Pilih periode"
        eyebrow="Custom range"
        startDate={customStartDate}
        endDate={customEndDate}
        onClose={() => setRangeModalVisible(false)}
        onApply={(startDate, endDate) => {
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
          setPeriod('customRange');
          setRangeModalVisible(false);
        }}
      />
      <DateRangeModal
        visible={comparisonRangeModalVisible}
        title="Bandingkan dengan"
        eyebrow="Comparison range"
        startDate={comparisonStartDate}
        endDate={comparisonEndDate}
        onClose={() => setComparisonRangeModalVisible(false)}
        onApply={(startDate, endDate) => {
          setComparisonStartDate(startDate);
          setComparisonEndDate(endDate);
          setComparisonCustom(true);
          setComparisonRangeModalVisible(false);
        }}
      />
    </View>
  );
}

function PeriodSelector({
  value,
  rangeLabel,
  onChange,
  onOpenRange,
}: {
  value: SummaryPeriodType;
  rangeLabel: string;
  onChange(value: SummaryPeriodType): void;
  onOpenRange(): void;
}) {
  const items: Array<{value: SummaryPeriodType; label: string}> = [
    {value: 'today', label: 'Today'},
    {value: 'week', label: 'Week'},
    {value: 'month', label: 'Month'},
    {value: 'all', label: 'All'},
    {value: 'lastWeek', label: 'Prev Week'},
    {value: 'lastMonth', label: 'Prev Month'},
  ];

  return (
    <View style={styles.periodBlock}>
      <View style={styles.periodHeader}>
        <View>
          <Text style={styles.periodTitle}>Periode</Text>
          <Text style={styles.periodSubtitle}>
            {value === 'customRange' ? rangeLabel : formatPeriodAction(value)}
          </Text>
        </View>
        <Pressable style={styles.periodRangeButton} onPress={onOpenRange}>
          <Text style={styles.periodRangeText}>Pilih Range</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodScroll}>
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
      </ScrollView>
    </View>
  );
}

function BalanceCard({
  summary,
}: {
  summary: FinancialSummary;
}) {
  const balance = summary.netCashFlow;

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

function ComparisonCard({
  current,
  previous,
  custom,
  onOpenRange,
  onReset,
}: {
  current: FinancialSummary;
  previous: FinancialSummary | null;
  custom: boolean;
  onOpenRange(): void;
  onReset(): void;
}) {
  if (!previous || current.period === 'all') {
    return null;
  }

  const netDiff = current.netCashFlow - previous.netCashFlow;
  const expenseDiff = current.totalExpense - previous.totalExpense;
  const incomeDiff = current.totalIncome - previous.totalIncome;

  return (
    <View style={styles.compareCard}>
      <View style={styles.overviewHeader}>
        <View>
          <Text style={styles.cardTitle}>Period comparison</Text>
          <Text style={styles.cardSubtitle}>
            {formatRangeShort(current.startDate, current.endDate)} vs {formatRangeShort(previous.startDate, previous.endDate)}
          </Text>
        </View>
        <View style={styles.compareActions}>
          {custom ? (
            <Pressable style={styles.compareResetButton} onPress={onReset}>
              <Text style={styles.compareResetText}>Auto</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.compareRangeButton} onPress={onOpenRange}>
            <Text style={styles.compareRangeText}>Bandingkan</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.compareGrid}>
        <CompareMetric label="Income" value={incomeDiff} positiveGood />
        <CompareMetric label="Expense" value={expenseDiff} positiveGood={false} />
        <CompareMetric label="Net" value={netDiff} positiveGood />
      </View>
    </View>
  );
}

function CompareMetric({
  label,
  value,
  positiveGood,
}: {
  label: string;
  value: number;
  positiveGood: boolean;
}) {
  const isPositive = value >= 0;
  const good = positiveGood ? isPositive : !isPositive;
  return (
    <View style={styles.compareMetric}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareValue, good ? styles.compareGood : styles.compareBad]}>
        {isPositive ? '+' : '-'}{formatCurrency(Math.abs(value))}
      </Text>
    </View>
  );
}

function SummaryChart({summary}: {summary: FinancialSummary}) {
  const rows = summary.dailyCashflow.slice(-7);
  const maxValue = Math.max(
    1,
    ...rows.flatMap(item => [item.income, item.expense, Math.abs(item.net)]),
  );

  return (
    <View style={styles.chartCard}>
      <View style={styles.overviewHeader}>
        <View>
          <Text style={styles.cardTitle}>Transaction graph</Text>
          <Text style={styles.cardSubtitle}>Income, expense, dan net harian</Text>
        </View>
      </View>
      {rows.length === 0 ? (
        <Text style={styles.mutedText}>Belum ada data grafik pada periode ini.</Text>
      ) : (
        <View style={styles.chartBars}>
          {rows.map(item => (
            <View key={item.date} style={styles.chartColumn}>
              <View style={styles.chartStack}>
                <View style={[styles.chartBar, styles.chartIncome, {height: chartHeight(item.income, maxValue)}]} />
                <View style={[styles.chartBar, styles.chartExpense, {height: chartHeight(item.expense, maxValue)}]} />
                <View style={[styles.chartBar, item.net >= 0 ? styles.chartNetPositive : styles.chartNetNegative, {height: chartHeight(Math.abs(item.net), maxValue)}]} />
              </View>
              <Text style={styles.chartLabel}>{formatChartDate(item.date)}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.chartLegend}>
        <LegendDot label="Income" color={colors.teal} />
        <LegendDot label="Expense" color={colors.red} />
        <LegendDot label="Net" color={colors.primary} />
      </View>
    </View>
  );
}

function LegendDot({label, color}: {label: string; color: string}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, {backgroundColor: color}]} />
      <Text style={styles.legendText}>{label}</Text>
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

function SourceOverview({
  sources,
}: {
  sources: FinancialSummary['sourceSummary'];
}) {
  const topSources = sources.slice(0, 4);
  if (topSources.length === 0) {
    return null;
  }

  return (
    <View style={styles.sourceCard}>
      <View style={styles.overviewHeader}>
        <View>
          <Text style={styles.cardTitle}>Source activity</Text>
          <Text style={styles.cardSubtitle}>Uang masuk dan keluar per aplikasi</Text>
        </View>
      </View>
      <View style={styles.sourceList}>
        {topSources.map(source => (
          <SourceRow key={`${source.sourceType}-${source.sourcePackageName ?? source.sourceName}`} source={source} />
        ))}
      </View>
    </View>
  );
}

function SourceRow({
  source,
}: {
  source: FinancialSummary['sourceSummary'][number];
}) {
  return (
    <View style={styles.sourceRow}>
      <View style={styles.sourceAvatar}>
        <Text style={styles.sourceAvatarText}>{source.sourceName.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.sourceCopy}>
        <Text style={styles.sourceName} numberOfLines={1}>{source.sourceName}</Text>
        <Text style={styles.sourceMeta}>{source.count} transaksi periode ini</Text>
      </View>
      <View style={styles.sourceAmounts}>
        <Text style={styles.sourceBalance}>Saldo {formatCurrency(source.balance)}</Text>
        <Text style={styles.sourceIncome}>+{formatCurrency(source.income)}</Text>
        <Text style={styles.sourceExpense}>-{formatCurrency(source.expense)}</Text>
      </View>
    </View>
  );
}

function GoalCard({
  goals,
  target,
  currentAmount,
  progress,
  onPress,
}: {
  goals: SavingsGoal[];
  target: number;
  currentAmount: number;
  progress: number;
  onPress(): void;
}) {
  const hasGoals = goals.length > 0;
  const current = hasGoals ? Math.min(currentAmount, target) : 0;
  const remaining = Math.max(target - currentAmount, 0);
  const achieved = hasGoals && currentAmount >= target;
  const title = hasGoals
    ? goals.length === 1 ? goals[0].name : `${goals.length} goals aktif`
    : 'Belum ada goal';

  return (
    <Pressable style={styles.goalCard} onPress={onPress}>
      <View style={styles.goalBadge}>
        <Text style={styles.goalBadgeText}>GO</Text>
      </View>
      <View style={styles.goalMain}>
        <Text style={styles.goalTitle}>{title}</Text>
        <Text style={styles.goalTarget}>
          {hasGoals ? `Total target ${formatCurrency(target)}` : 'Tap untuk setup target tabungan'}
        </Text>
        <ProgressBar progress={progress} color={colors.teal} />
        <View style={styles.goalFooter}>
          <Text style={styles.goalCurrent}>{formatCurrency(current)}</Text>
          <Text style={styles.goalNeed}>
            {hasGoals ? achieved ? 'Berhasil' : `Kurang ${formatCurrency(remaining)}` : 'Setup'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function SaveCard({balance}: {balance: number}) {
  return (
    <View style={styles.saveCard}>
      <View>
        <Text style={styles.saveLabel}>VIP Save</Text>
        <Text style={styles.saveTitle}>Smart saving pocket</Text>
        <Text style={styles.saveText}>Net saving dari seluruh transaksi.</Text>
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

function AiAnalysisModal({
  visible,
  summary,
  budgetUsed,
  loading,
  error,
  result,
  onClose,
}: {
  visible: boolean;
  summary: FinancialSummary;
  budgetUsed: number;
  loading: boolean;
  error: string | null;
  result: AiAnalysisResult | null;
  onClose(): void;
}) {
  const fallback = buildMockAiAnalysis(summary, budgetUsed);
  const score = result?.financialScore.score ?? fallback.score;
  const maxScore = result?.financialScore.maxScore ?? 100;
  const percentage = result?.financialScore.percentage ?? score;
  const scoreColor = result
    ? score >= 75 ? colors.teal : score >= 55 ? colors.orange : colors.red
    : fallback.scoreColor;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.aiSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          {loading ? (
            <View style={styles.aiLoadingState}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.aiTitle}>Menganalisis keuangan...</Text>
              <Text style={styles.aiSummary}>Sedang membaca transaksi dan goals periode ini.</Text>
              <View style={styles.aiLoadingBar}>
                <View style={styles.aiLoadingFill} />
              </View>
            </View>
          ) : error ? (
            <View style={styles.aiLoadingState}>
              <Text style={styles.aiTitle}>Analisis gagal</Text>
              <Text style={styles.aiSummary}>{error}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalEyebrow}>{result?.model ? `Model ${result.model}` : 'AI assessment'}</Text>
              <Text style={styles.aiTitle}>{result?.title ?? fallback.title}</Text>
              <Text style={styles.aiSummary}>{result?.description ?? fallback.summary}</Text>

              <View style={styles.aiScoreCard}>
                <Text style={styles.aiScoreLabel}>{result?.financialScore.label ?? 'Financial score'}</Text>
                <Text style={styles.aiScoreValue}>{score}/{maxScore}</Text>
                <Text style={styles.aiScoreDesc}>{result?.financialScore.description ?? ''}</Text>
                <ProgressBar progress={percentage / 100} color={scoreColor} />
              </View>

              <View style={styles.aiMetrics}>
                <AiMetric label="Income" value={result?.summaryCards.income.text ?? formatCurrency(summary.totalIncome)} />
                <AiMetric label="Expense" value={result?.summaryCards.expense.text ?? formatCurrency(summary.totalExpense)} />
                <AiMetric label="Net" value={result?.summaryCards.net.text ?? formatCurrency(summary.netCashFlow)} />
              </View>

              {result?.potentialSaving ? (
                <View style={styles.potentialSavingCard}>
                  <Text style={styles.aiScoreLabel}>Potential saving</Text>
                  <Text style={styles.potentialSavingAmount}>{result.potentialSaving.text}</Text>
                  <Text style={styles.aiSummary}>{result.potentialSaving.description}</Text>
                </View>
              ) : null}

              <Text style={styles.aiSectionTitle}>Key findings</Text>
              {toFindingRows(result?.keyFindings, fallback.findings).map(item => (
                <AiFindingRow key={`${item.title}-${item.description}`} item={item} />
              ))}

              <Text style={styles.aiSectionTitle}>Recommended actions</Text>
              {toFindingRows(result?.recommendedActions, fallback.actions).map(item => (
                <AiFindingRow key={`${item.title}-${item.description}`} item={item} />
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Tutup</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AiMetric({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.aiMetricCard}>
      <Text style={styles.aiMetricLabel}>{label}</Text>
      <Text style={styles.aiMetricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function AiFindingRow({item}: {item: AiFinding}) {
  return (
    <View style={styles.aiBulletRow}>
      <View style={styles.aiBulletDot} />
      <View style={styles.aiFindingCopy}>
        <Text style={styles.aiFindingTitle}>{item.title}</Text>
        <Text style={styles.aiBulletText}>{item.description}</Text>
      </View>
    </View>
  );
}

function toFindingRows(apiRows: AiFinding[] | undefined, fallbackRows: string[]): AiFinding[] {
  if (apiRows && apiRows.length > 0) {
    return apiRows;
  }
  return fallbackRows.map(text => ({title: text, description: ''}));
}

function buildMockAiAnalysis(summary: FinancialSummary, budgetUsed: number) {
  const savingsRate = summary.totalIncome > 0 ? summary.netCashFlow / summary.totalIncome : 0;
  const topExpense = summary.topExpenseCategories[0];
  const topExpenseLabel = topExpense ? formatCategoryLabel(topExpense.category) : 'belum ada kategori dominan';

  const score = Math.max(
    25,
    Math.min(
      95,
      Math.round(70 + savingsRate * 30 - Math.max(0, budgetUsed - 0.8) * 40),
    ),
  );

  const status =
    summary.netCashFlow >= 0
      ? 'Cashflow periode ini masih positif.'
      : 'Cashflow periode ini negatif dan perlu dikendalikan.';

  return {
    score,
    scoreColor: score >= 75 ? colors.teal : score >= 55 ? colors.orange : colors.red,
    title: score >= 75 ? 'Keuangan cukup sehat' : score >= 55 ? 'Keuangan perlu dijaga' : 'Keuangan perlu perhatian',
    summary: `${status} Pengeluaran terbesar ada di ${topExpenseLabel}.`,
    findings: [
      `Income tercatat ${formatCurrency(summary.totalIncome)} dan expense ${formatCurrency(summary.totalExpense)}.`,
      `Net cashflow periode ini ${formatCurrency(summary.netCashFlow)}.`,
      `Budget terpakai sekitar ${Math.round(budgetUsed * 100)}% dari asumsi budget bulanan.`,
    ],
    actions: [
      summary.netCashFlow < 0
        ? 'Kurangi transaksi non-prioritas sampai cashflow kembali positif.'
        : 'Pertahankan cashflow positif dan sisihkan sebagian ke dana darurat.',
      topExpense
        ? `Review kategori ${topExpenseLabel} karena menjadi pengeluaran terbesar.`
        : 'Tambahkan lebih banyak data transaksi agar analisis kategori lebih akurat.',
      'Analisis AI bisa memberi rekomendasi yang lebih akurat saat histori transaksi makin lengkap.',
    ],
  };
}

function DateRangeModal({
  visible,
  title,
  eyebrow,
  startDate,
  endDate,
  onClose,
  onApply,
}: {
  visible: boolean;
  title: string;
  eyebrow: string;
  startDate: number;
  endDate: number;
  onClose(): void;
  onApply(startDate: number, endDate: number): void;
}) {
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [mode, setMode] = useState<'start' | 'end'>('start');
  const [month, setMonth] = useState(startOfMonth(startDate));

  useEffect(() => {
    if (visible) {
      setDraftStart(startDate);
      setDraftEnd(endDate);
      setMode('start');
      setMonth(startOfMonth(startDate));
    }
  }, [endDate, startDate, visible]);

  const monthDate = new Date(month);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const blanks = Array.from({length: firstDay}, (_, index) => `blank-${index}`);
  const days = Array.from({length: daysInMonth}, (_, index) => index + 1);
  const monthLabel = monthDate.toLocaleDateString('id-ID', {month: 'long', year: 'numeric'});

  const selectDate = (value: number) => {
    if (mode === 'start') {
      const nextStart = startOfDay(value);
      setDraftStart(nextStart);
      if (nextStart > draftEnd) {
        setDraftEnd(endOfDay(nextStart));
      }
      setMode('end');
      return;
    }
    const nextEnd = endOfDay(value);
    setDraftEnd(nextEnd < draftStart ? endOfDay(draftStart) : nextEnd);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.rangeSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalEyebrow}>{eyebrow}</Text>
          <Text style={styles.aiTitle}>{title}</Text>
          <View style={styles.rangeTabs}>
            <Pressable
              style={[styles.rangeTab, mode === 'start' && styles.rangeTabActive]}
              onPress={() => setMode('start')}>
              <Text style={[styles.rangeTabLabel, mode === 'start' && styles.rangeTabLabelActive]}>Start</Text>
              <Text style={[styles.rangeTabDate, mode === 'start' && styles.rangeTabDateActive]}>{formatRangeDate(draftStart)}</Text>
            </Pressable>
            <Pressable
              style={[styles.rangeTab, mode === 'end' && styles.rangeTabActive]}
              onPress={() => setMode('end')}>
              <Text style={[styles.rangeTabLabel, mode === 'end' && styles.rangeTabLabelActive]}>End</Text>
              <Text style={[styles.rangeTabDate, mode === 'end' && styles.rangeTabDateActive]}>{formatRangeDate(draftEnd)}</Text>
            </Pressable>
          </View>

          <View style={styles.dateModalHeader}>
            <Pressable style={styles.monthButton} onPress={() => setMonth(addMonths(month, -1))}>
              <Text style={styles.monthButtonText}>{'<'}</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable style={styles.monthButton} onPress={() => setMonth(addMonths(month, 1))}>
              <Text style={styles.monthButtonText}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <Text key={day} style={styles.weekText}>{day}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {blanks.map(item => <View key={item} style={styles.dayCell} />)}
            {days.map(day => {
              const value = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 9, 0, 0, 0).getTime();
              const selected = sameDate(value, draftStart) || sameDate(value, draftEnd);
              const inRange = value >= startOfDay(draftStart) && value <= endOfDay(draftEnd);
              return (
                <Pressable
                  key={day}
                  style={[styles.dayCell, inRange && styles.dayCellInRange, selected && styles.dayCellSelected]}
                  onPress={() => selectDate(value)}>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.rangeActions}>
            <Pressable style={styles.rangeCancelButton} onPress={onClose}>
              <Text style={styles.rangeCancelText}>Batal</Text>
            </Pressable>
            <Pressable style={styles.rangeApplyButton} onPress={() => onApply(startOfDay(draftStart), endOfDay(draftEnd))}>
              <Text style={styles.rangeApplyText}>Terapkan</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatPeriodAction(period: SummaryPeriodType): string {
  const labels: Record<SummaryPeriodType, string> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    all: 'All time',
    lastWeek: 'Last week',
    lastMonth: 'Last month',
    customRange: 'Custom range',
  };
  return labels[period];
}

function buildComparisonRange(summary: FinancialSummary): {startDate: number; endDate: number} | null {
  if (summary.period === 'all') {
    return null;
  }
  if (summary.period === 'today') {
    const endDate = startOfDay(summary.startDate) - 1;
    return {startDate: startOfDay(endDate), endDate: endOfDay(endDate)};
  }
  if (summary.period === 'week') {
    const endDate = startOfWeek(summary.startDate) - 1;
    return {startDate: startOfWeek(endDate), endDate};
  }
  if (summary.period === 'month') {
    const endDate = startOfMonth(summary.startDate) - 1;
    return {startDate: startOfMonth(endDate), endDate};
  }
  const duration = Math.max(dayMs, summary.endDate - summary.startDate);
  const endDate = summary.startDate - 1;
  return {startDate: endDate - duration, endDate};
}

function getGoalStartDate(goal: SavingsGoal): number {
  return startOfDay(goal.startDate ?? goal.targetDate ?? Date.now());
}

function getGoalEndDate(goal: SavingsGoal): number {
  return endOfDay(goal.endDate ?? goal.targetDate ?? Date.now());
}

function chartHeight(value: number, maxValue: number): number {
  if (value <= 0) {
    return 3;
  }
  return Math.max(8, Math.round((value / maxValue) * 82));
}

function formatChartDate(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'});
}

function formatRangeShort(startDate: number, endDate: number): string {
  return `${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}`;
}

function formatRangeDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'});
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function startOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addMonths(timestamp: number, offset: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + offset);
  return startOfMonth(date.getTime());
}

function sameDate(left: number, right: number): boolean {
  const a = new Date(left);
  const b = new Date(right);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
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
    paddingBottom: 112,
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
  periodBlock: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    paddingVertical: 6,
  },
  periodHeader: {
    minHeight: 50,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  periodTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  periodSubtitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  periodRangeButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodRangeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  periodScroll: {
    paddingHorizontal: 6,
    gap: 7,
  },
  segmentButton: {
    minWidth: 78,
    minHeight: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rangeButton: {},
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
  compareCard: {
    padding: 14,
    marginBottom: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  compareGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  compareActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  compareRangeButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareRangeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  compareResetButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareResetText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  compareMetric: {
    flex: 1,
    minHeight: 58,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    justifyContent: 'center',
  },
  compareLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },
  compareValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  compareGood: {
    color: colors.teal,
  },
  compareBad: {
    color: colors.red,
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  chartBars: {
    height: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartStack: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  chartBar: {
    width: 7,
    borderRadius: 4,
  },
  chartIncome: {
    backgroundColor: colors.teal,
  },
  chartExpense: {
    backgroundColor: colors.red,
  },
  chartNetPositive: {
    backgroundColor: colors.primary,
  },
  chartNetNegative: {
    backgroundColor: colors.orange,
  },
  chartLabel: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
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
  sourceCard: {
    borderRadius: radii.xl,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadow,
  },
  sourceList: {
    gap: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sourceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceAvatarText: {
    color: colors.primary,
    fontWeight: '900',
  },
  sourceCopy: {
    flex: 1,
  },
  sourceName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  sourceMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  sourceAmounts: {
    alignItems: 'flex-end',
    minWidth: 112,
  },
  sourceBalance: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
  },
  sourceIncome: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: '900',
  },
  sourceExpense: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
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
  aiFab: {
    position: 'absolute',
    right: 14,
    minHeight: 42,
    borderRadius: 21,
    paddingLeft: 9,
    paddingRight: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadow,
  },
  aiFabIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 10,
    fontWeight: '900',
  },
  aiFabText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(25,21,45,0.38)',
  },
  aiSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    paddingBottom: 24,
  },
  rangeSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  aiTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  aiSummary: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  rangeTabs: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  rangeTab: {
    flex: 1,
    minHeight: 58,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  rangeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangeTabLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  rangeTabLabelActive: {
    color: '#ddd5ff',
  },
  rangeTabDate: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  rangeTabDateActive: {
    color: colors.surface,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    color: colors.primary,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '900',
  },
  monthTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  dayCellInRange: {
    backgroundColor: colors.primarySoft,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  dayTextSelected: {
    color: colors.surface,
    fontWeight: '900',
  },
  rangeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  rangeCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeCancelText: {
    color: colors.ink,
    fontWeight: '900',
  },
  rangeApplyButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeApplyText: {
    color: colors.surface,
    fontWeight: '900',
  },
  aiScoreCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  aiScoreLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  aiScoreValue: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
  },
  aiScoreDesc: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  aiLoadingState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  aiLoadingBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSoft,
    marginTop: 18,
    overflow: 'hidden',
  },
  aiLoadingFill: {
    width: '76%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  aiMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  aiMetricCard: {
    flex: 1,
    minHeight: 68,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    padding: 10,
    justifyContent: 'center',
  },
  aiMetricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 5,
  },
  aiMetricValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  aiSectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 8,
  },
  aiBulletRow: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    marginBottom: 9,
  },
  aiBulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  aiBulletText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  aiFindingCopy: {
    flex: 1,
  },
  aiFindingTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  potentialSavingCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.tealSoft,
  },
  potentialSavingAmount: {
    color: colors.teal,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  modalCloseButton: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
});
