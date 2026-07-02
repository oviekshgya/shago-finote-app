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

export default function DashboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<SummaryPeriodType>('month');
  const {summary, loading, refresh} = useFinancialSummary(period);
  const [refreshing, setRefreshing] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [allTimeSaving, setAllTimeSaving] = useState(0);

  const loadGoalState = useCallback(async () => {
    const [storedGoals, allSummary] = await Promise.all([
      FinancialStorage.getAllGoals(),
      FinancialStorage.calculateFinancialSummary('all'),
    ]);
    setGoals(storedGoals.filter(goal => !goal.isArchived).sort((a, b) => a.targetDate - b.targetDate));
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

  const handleAnalyzeAi = async () => {
    setAiModalVisible(true);
    setAiLoading(true);
    setAiError(null);
    try {
      const payload = await buildAiAnalysisPayload({
        periodType: period,
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
  const primaryGoal = goals[0];
  const goalProgress = primaryGoal && primaryGoal.targetAmount > 0
    ? Math.min(allTimeSaving / primaryGoal.targetAmount, 1)
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

        <PeriodSelector value={period} onChange={setPeriod} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : summary ? (
          <>
            <BalanceCard summary={summary} />

            <SectionHeader title="Insights" action={formatPeriodAction(period)} />
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
              goal={primaryGoal}
              currentSaving={allTimeSaving}
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
    </View>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: SummaryPeriodType;
  onChange(value: SummaryPeriodType): void;
}) {
  const items: Array<{value: typeof value; label: string}> = [
    {value: 'today', label: 'Today'},
    {value: 'week', label: 'Week'},
    {value: 'month', label: 'Month'},
    {value: 'all', label: 'All'},
    {value: 'lastWeek', label: 'Last Week'},
    {value: 'lastMonth', label: 'Last Month'},
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
  goal,
  currentSaving,
  progress,
  onPress,
}: {
  goal?: SavingsGoal;
  currentSaving: number;
  progress: number;
  onPress(): void;
}) {
  const target = goal?.targetAmount ?? 0;
  const current = goal ? Math.min(currentSaving, goal.targetAmount) : 0;
  const remaining = Math.max(target - currentSaving, 0);
  const achieved = Boolean(goal && currentSaving >= goal.targetAmount);

  return (
    <Pressable style={styles.goalCard} onPress={onPress}>
      <View style={styles.goalBadge}>
        <Text style={styles.goalBadgeText}>GO</Text>
      </View>
      <View style={styles.goalMain}>
        <Text style={styles.goalTitle}>{goal?.name ?? 'Belum ada goal'}</Text>
        <Text style={styles.goalTarget}>
          {goal ? `Target ${formatCurrency(target)}` : 'Tap untuk setup target tabungan'}
        </Text>
        <ProgressBar progress={progress} color={colors.teal} />
        <View style={styles.goalFooter}>
          <Text style={styles.goalCurrent}>{formatCurrency(current)}</Text>
          <Text style={styles.goalNeed}>
            {goal ? achieved ? 'Berhasil' : `Kurang ${formatCurrency(remaining)}` : 'Setup'}
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

function formatPeriodAction(period: SummaryPeriodType): string {
  const labels: Record<SummaryPeriodType, string> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    all: 'All time',
    lastWeek: 'Last week',
    lastMonth: 'Last month',
  };
  return labels[period];
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
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 4,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  segmentButton: {
    flexGrow: 1,
    minWidth: '30%',
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
