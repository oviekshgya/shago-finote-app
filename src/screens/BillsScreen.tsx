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
import {colors, radii, shadow} from '../theme/finoteTheme';

export default function BillsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DueDate[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState(String(new Date().getDate()));
  const [dueMonth, setDueMonth] = useState(String(new Date().getMonth() + 1));
  const [installmentCount, setInstallmentCount] = useState('1');
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
    const day = clampNumber(Number(dueDay.replace(/[^\d]/g, '')), 1, 31);
    const month = clampNumber(Number(dueMonth.replace(/[^\d]/g, '')), 1, 12);
    const totalInstallments = clampNumber(Number(installmentCount.replace(/[^\d]/g, '')), 1, 60);
    if (!title.trim()) {
      Alert.alert('Nama tagihan wajib diisi');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Nominal belum valid');
      return;
    }

    const now = Date.now();
    const parentId = `bill-${now}`;
    const bills = Array.from({length: totalInstallments}, (_, index): DueDate => {
      const dueDate = buildDueDate(day, month, index);
      return {
        id: totalInstallments === 1 ? parentId : `${parentId}-${index + 1}`,
        title: totalInstallments === 1 ? title.trim() : `${title.trim()} (${index + 1}/${totalInstallments})`,
        amount: numericAmount,
        currency: 'IDR',
        dueDate,
        category: 'utilities',
        isRecurring,
        recurringInterval: isRecurring || totalInstallments > 1 ? 'monthly' : undefined,
        createdAt: now,
        updatedAt: now,
        isPaid: false,
        reminderDaysBefore: 1,
        installmentIndex: index + 1,
        installmentTotal: totalInstallments,
        parentInstallmentId: parentId,
      };
    });

    setSaving(true);
    try {
      for (const bill of bills) {
        await FinancialStorage.addDueDate(bill);
      }
      setTitle('');
      setAmount('');
      setDueDay(String(new Date().getDate()));
      setDueMonth(String(new Date().getMonth() + 1));
      setInstallmentCount('1');
      setIsRecurring(false);
      await loadItems();
      Alert.alert('Tagihan tersimpan', `${bills.length} tagihan jatuh tempo berhasil ditambahkan.`);
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Goals</Text>
          <Text style={styles.title}>Bills & targets</Text>
          <Text style={styles.subtitle}>Catat pembayaran keluar dan tanggal jatuh tempo.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>New payment goal</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Nama tagihan, misal Internet Rumah"
            placeholderTextColor={colors.faint}
          />
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={value => setAmount(formatRupiahInput(value))}
            keyboardType="numeric"
            placeholder="Rp 250.000"
            placeholderTextColor={colors.faint}
          />
          <Text style={styles.inputLabel}>Tanggal jatuh tempo</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={dueDay}
              onChangeText={setDueDay}
              keyboardType="numeric"
              placeholder="Tanggal"
              placeholderTextColor={colors.faint}
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={dueMonth}
              onChangeText={setDueMonth}
              keyboardType="numeric"
              placeholder="Bulan"
              placeholderTextColor={colors.faint}
              maxLength={2}
            />
          </View>
          <TextInput
            style={styles.input}
            value={installmentCount}
            onChangeText={setInstallmentCount}
            keyboardType="numeric"
            placeholder="Jumlah cicilan/tagihan, contoh 12"
            placeholderTextColor={colors.faint}
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

        <Text style={styles.sectionTitle}>Upcoming</Text>
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
        {item.installmentTotal && item.installmentTotal > 1 && (
          <Text style={styles.billRepeat}>Cicilan {item.installmentIndex}/{item.installmentTotal}</Text>
        )}
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

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function buildDueDate(day: number, month: number, monthOffset: number): number {
  const now = new Date();
  const year = now.getFullYear();
  const date = new Date(year, month - 1 + monthOffset, 1, 9, 0, 0, 0);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  if (date.getTime() < now.getTime()) {
    date.setMonth(date.getMonth() + 1);
  }
  return date.getTime();
}

function formatRupiahInput(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) {
    return '';
  }
  return `Rp ${Number(digits).toLocaleString('id-ID')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 18,
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
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },
  formCard: {
    padding: 16,
    marginBottom: 20,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  input: {
    minHeight: 46,
    marginBottom: 10,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 14,
  },
  inputLabel: {
    marginBottom: 8,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInput: {
    flex: 1,
  },
  toggleRow: {
    minHeight: 46,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  toggleText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleValue: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    minHeight: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.surface,
    fontWeight: '900',
  },
  emptyCard: {
    padding: 18,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.ink,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  billMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  billRepeat: {
    color: colors.teal,
    fontSize: 11,
    marginTop: 4,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  billStatus: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  billStatusOverdue: {
    color: colors.red,
  },
  paidButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: colors.tealSoft,
  },
  paidButtonText: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: '800',
  },
});
