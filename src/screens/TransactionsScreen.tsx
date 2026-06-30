import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTransactions} from '../hooks/useTransactions';
import type {FinancialTransaction} from '../types/FinancialTransaction';
import {
  formatCurrency,
  formatTransactionDate,
  groupTransactionsByDate,
} from '../utils/TransactionUtils';
import {colors, radii, shadow} from '../theme/finoteTheme';

export default function TransactionsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const {transactions, loading} = useTransactions();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = transactions
    .filter(t => {
      if (filterType !== 'all' && t.type !== filterType) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          t.description.toLowerCase().includes(query) ||
          (t.merchant?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => b.date - a.date);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, item) => {
        if (item.type === 'income') {
          acc.income += item.amount;
        }
        if (item.type === 'expense') {
          acc.expense += item.amount;
        }
        return acc;
      },
      {income: 0, expense: 0},
    );
  }, [filtered]);

  const sections = Object.entries(groupTransactionsByDate(filtered)).map(([date, items]) => ({
    date,
    items,
  }));

  return (
    <View style={[styles.container, {paddingTop: Math.max(insets.top, 16)}]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Insights</Text>
        <Text style={styles.title}>Spending details</Text>
        <Text style={styles.subtitle}>{filtered.length} transaksi ditemukan</Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryPill label="Income" value={formatCurrency(totals.income)} tone="teal" />
        <SummaryPill label="Expense" value={formatCurrency(totals.expense)} tone="pink" />
      </View>

      <View style={styles.controlsContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions"
          placeholderTextColor={colors.faint}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterButtons}>
          {(['all', 'income', 'expense'] as const).map(type => (
            <Pressable
              key={type}
              style={[styles.filterButton, filterType === type && styles.filterButtonActive]}
              onPress={() => setFilterType(type)}>
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === type && styles.filterButtonTextActive,
                ]}>
                {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expense'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyText}>Data transaksi akan muncul setelah dicatat manual atau ditangkap dari notifikasi.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => item.date}
          renderItem={({item: section}) => (
            <View>
              <Text style={styles.dateHeader}>{formatDateHeader(section.date)}</Text>
              <View style={styles.sectionCard}>
                {section.items.map(transaction => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'teal' | 'pink';
}) {
  return (
    <View style={styles.summaryPill}>
      <View style={[styles.summaryIcon, tone === 'teal' ? styles.tealSoft : styles.pinkSoft]}>
        <Text style={[styles.summaryIconText, tone === 'teal' ? styles.tealText : styles.pinkText]}>
          {tone === 'teal' ? '+' : '-'}
        </Text>
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function TransactionItem({transaction}: {transaction: FinancialTransaction}) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.teal : colors.red;
  const initial = (transaction.merchant || transaction.description || '?').slice(0, 1).toUpperCase();

  return (
    <Pressable style={styles.transactionItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionTime}>{formatTransactionDate(transaction.date)}</Text>
      </View>
      <Text style={[styles.transactionAmount, {color: amountColor}]} numberOfLines={1}>
        {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  summaryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.lg,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: {
    fontWeight: '900',
    fontSize: 20,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  tealSoft: {
    backgroundColor: colors.tealSoft,
  },
  pinkSoft: {
    backgroundColor: colors.pinkSoft,
  },
  tealText: {
    color: colors.teal,
  },
  pinkText: {
    color: colors.pink,
  },
  controlsContainer: {
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    minHeight: 48,
    color: colors.ink,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
  },
  filterButtonTextActive: {
    color: colors.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    margin: 18,
    padding: 18,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.muted,
    marginTop: 14,
    marginBottom: 9,
  },
  sectionCard: {
    borderRadius: radii.xl,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '900',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 11,
    color: colors.muted,
  },
  transactionAmount: {
    maxWidth: 120,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
});
