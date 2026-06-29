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
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1c" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transaksi</Text>
        <Text style={styles.subtitle}>{filtered.length} transaksi ditemukan</Text>
      </View>

      {/* Search & Filter */}
      <View style={styles.controlsContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi, merchant..."
          placeholderTextColor="#9ca3af"
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
                {type === 'all' ? 'Semua' : type === 'income' ? 'Masuk' : 'Keluar'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Transactions List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#c9152a" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tidak ada transaksi</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => item.date}
          renderItem={({ item: section }) => (
            <View key={section.date}>
              <Text style={styles.dateHeader}>{formatDateHeader(section.date)}</Text>
              {section.items.map(transaction => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function TransactionItem({ transaction }: any) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? '#4ade80' : '#f87171';

  return (
    <Pressable style={styles.transactionItem}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionTime}>{formatTransactionDate(transaction.date)}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
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
    backgroundColor: '#111113',
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
    fontSize: 12,
    color: '#9ca3af',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#2a2a2c',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#ffffff',
    marginBottom: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#303036',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#2a2a2c',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  filterButtonActive: {
    backgroundColor: '#c9152a',
    borderColor: '#c9152a',
  },
  filterButtonText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
    minWidth: 80,
    textAlign: 'right',
  },
});
