/**
 * Bills Screen
 * Manajemen tagihan dan pembayaran jatuh tempo.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FinancialStorage} from '../storage/FinancialStorage';
import type {DueDate} from '../types/FinancialTransaction';
import {formatCurrency, formatTransactionDate} from '../utils/TransactionUtils';

export default function BillsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DueDate[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueInDays, setDueInDays] = useState('7');
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    const data = await FinancialStorage.getAllDueDates();
    setItems(data.sort((a, b) => a.dueDate - b.dueDate));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const saveBill = async () => {
    const numericAmount = Number(amount.replace(/[^\d]/g, ''));
    const days = Number(dueInDays.replace(/[^\d]/g, ''));
    if (!title.trim()) {
      Alert.alert('Nama tagihan wajib diisi');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Nominal belum valid');
      return;
    }

    const now = Date.now();
    const bill: DueDate = {
      id: `bill-${now}`,
      title: title.trim(),
      amount: numericAmount,
      currency: 'IDR',
      dueDate: now + Math.max(days || 0, 0) * 24 * 60 * 60 * 1000,
      category: 'utilities',
      isRecurring,
      recurringInterval: isRecurring ? 'monthly' : undefined,
      createdAt: now,
      updatedAt: now,
      isPaid: false,
      reminderDaysBefore: 1,
    };

    setSaving(true);
    try {
      await FinancialStorage.addDueDate(bill);
      setTitle('');
      setAmount('');
      setDueInDays('7');
      setIsRecurring(false);
      await loadItems();
      Alert.alert('Tagihan tersimpan', 'Tagihan jatuh tempo berhasil ditambahkan.');
    } catch (error) {
      Alert.alert('Gagal menyimpan', String(error));
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (item: DueDate) => {
    await FinancialStorage.updateDueDate(item.id, {
      isPaid: true,
      paidDate: Date.now(),
    });
    await loadItems();
  };

  return (
    <View style={[styles.container, {paddingTop: Math.max(insets.top, 16)}]}>
      <StatusBar barStyle="light-content" backgroundColor="#111113" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Tagihan</Text>
          <Text style={styles.subtitle}>Catat pembayaran keluar dan tanggal jatuh tempo.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Tambah Tagihan</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Nama tagihan, misal Internet Rumah"
            placeholderTextColor="#737373"
          />
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Nominal"
            placeholderTextColor="#737373"
          />
          <TextInput
            style={styles.input}
            value={dueInDays}
            onChangeText={setDueInDays}
            keyboardType="numeric"
            placeholder="Jatuh tempo dalam berapa hari"
            placeholderTextColor="#737373"
          />
          <Pressable
            style={[styles.toggleRow, isRecurring && styles.toggleRowActive]}
            onPress={() => setIsRecurring(value => !value)}>
            <Text style={styles.toggleText}>Tagihan berulang bulanan</Text>
            <Text style={styles.toggleValue}>{isRecurring ? 'Aktif' : 'Off'}</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={saveBill} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Menyimpan...' : 'Simpan Tagihan'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Daftar Tagihan</Text>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada tagihan</Text>
            <Text style={styles.emptyText}>Tambahkan pembayaran keluar agar jatuh tempo terlihat di sini.</Text>
          </View>
        ) : (
          items.map(item => <BillItem key={item.id} item={item} onPaid={() => markPaid(item)} />)
        )}
      </ScrollView>
    </View>
  );
}

function BillItem({item, onPaid}: {item: DueDate; onPaid(): void}) {
  const now = Date.now();
  const isOverdue = item.dueDate < now && !item.isPaid;
  const statusText = item.isPaid ? 'Lunas' : isOverdue ? 'Terlambat' : 'Upcoming';

  return (
    <View style={styles.billItem}>
      <View style={styles.billInfo}>
        <Text style={styles.billTitle}>{item.title}</Text>
        <Text style={styles.billMeta}>{formatTransactionDate(item.dueDate)}</Text>
        {item.isRecurring && <Text style={styles.billRepeat}>Berulang bulanan</Text>}
      </View>
      <View style={styles.billRight}>
        <Text style={styles.billAmount}>{formatCurrency(item.amount)}</Text>
        <Text style={[styles.billStatus, isOverdue && styles.billStatusOverdue]}>
          {statusText}
        </Text>
        {!item.isPaid && (
          <Pressable style={styles.paidButton} onPress={onPaid}>
            <Text style={styles.paidButtonText}>Lunas</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111113',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#9ca3af',
  },
  formCard: {
    padding: 14,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  input: {
    minHeight: 46,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  toggleRow: {
    minHeight: 46,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#242428',
    borderWidth: 1,
    borderColor: '#303036',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowActive: {
    borderColor: '#22c55e',
    backgroundColor: '#1f3d2a',
  },
  toggleText: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleValue: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#c9152a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  emptyCard: {
    padding: 18,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  emptyTitle: {
    color: '#ffffff',
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  billMeta: {
    color: '#9ca3af',
    fontSize: 12,
  },
  billRepeat: {
    color: '#86efac',
    fontSize: 11,
    marginTop: 4,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  billStatus: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  billStatusOverdue: {
    color: '#f87171',
  },
  paidButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#14532d',
  },
  paidButtonText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '800',
  },
});
