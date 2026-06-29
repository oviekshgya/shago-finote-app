/**
 * Transactions Screen
 * List, search, dan filter transaksi
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModernCard } from '../components/ModernCard';
import { ModernInput } from '../components/ModernInput';
import { ModernButton } from '../components/ModernButton';
import { colors, spacing, typography, borderRadius } from '../theme/spacing';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency, formatTransactionDate, groupTransactionsByDate } from '../utils/TransactionUtils';

export default function TransactionsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { transactions, loading } = useTransactions();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Group transactions by date
  const filtered = transactions
    .filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
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

  const grouped = groupTransactionsByDate(filtered);
  const sections = Object.entries(grouped).map(([date, items]) => ({
    date,
    items,
  }));

  return (
    <LinearGradient
      colors={colors.gradients.background}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[styles.container, { paddingTop: Math.max(insets.top, 0) }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💳 Transaksi</Text>
        <Text style={styles.subtitle}>{filtered.length} transaksi</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <ModernInput
          placeholder="Cari merchant, jumlah..."
          value={search}
          onChangeText={setSearch}
          icon="🔍"
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        {(['all', 'income', 'expense'] as const).map(type => (
          <ModernButton
            key={type}
            label={type === 'all' ? 'Semua' : type === 'income' ? '📥 Masuk' : '📤 Keluar'}
            onPress={() => setFilterType(type)}
            variant={filterType === type ? 'primary' : 'outline'}
            size="sm"
            style={{flex: 1}}
          />
        ))}
      </View>

      {/* Transactions List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>Tidak ada transaksi</Text>
          <Text style={styles.emptyDesc}>Mulai catat transaksi untuk melihat riwayat</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => item.date}
          scrollEnabled={true}
          renderItem={({ item: section }) => (
            <View key={section.date}>
              <Text style={styles.dateHeader}>{formatDateHeader(section.date)}</Text>
              {section.items.map((transaction, idx) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  isLast={idx === section.items.length - 1}
                />
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </LinearGradient>
  );
}

function TransactionItem({ transaction, isLast }: {transaction: any; isLast: boolean}) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const emoji = isIncome ? '📥' : '📤';

  return (
    <View
      style={[
        styles.transactionItemWrapper,
        !isLast && styles.transactionItemBorder,
      ]}>
      <View style={styles.transactionIconCircle}>
        <Text style={styles.transactionEmoji}>{emoji}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionTime}>{formatTransactionDate(transaction.date)}</Text>
      </View>
      <Text style={[styles.transactionAmount, {color: amountColor}]}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hari Ini';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Kemarin';
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
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dateHeader: {
    fontSize: typography.label,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  transactionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  transactionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionEmoji: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  transactionTime: {
    fontSize: typography.small,
    color: colors.textTertiary,
  },
  transactionAmount: {
    fontSize: typography.body,
    fontWeight: '700',
    marginLeft: spacing.md,
    minWidth: 100,
    textAlign: 'right',
  },
});
