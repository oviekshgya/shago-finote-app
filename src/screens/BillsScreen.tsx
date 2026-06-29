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
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ModernCard} from '../components/ModernCard';
import {ModernButton} from '../components/ModernButton';
import {ModernInput} from '../components/ModernInput';
import {colors, spacing, typography, borderRadius} from '../theme/spacing';
import {FinancialStorage} from '../storage/FinancialStorage';
import type {DueDate} from '../types/FinancialTransaction';
import {formatCurrency, formatTransactionDate} from '../utils/TransactionUtils';

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
    <LinearGradient
      colors={colors.gradients.background}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[styles.container, { paddingTop: Math.max(insets.top, 0) }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
            onChangeText={value => setAmount(formatRupiahInput(value))}
            keyboardType="numeric"
            placeholder="Rp 250.000"
            placeholderTextColor="#737373"
          />
          <Text style={styles.inputLabel}>Tanggal jatuh tempo</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={dueDay}
              onChangeText={setDueDay}
              keyboardType="numeric"
              placeholder="Tanggal"
              placeholderTextColor="#737373"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={dueMonth}
              onChangeText={setDueMonth}
              keyboardType="numeric"
              placeholder="Bulan"
              placeholderTextColor="#737373"
              maxLength={2}
            />
          </View>
          <TextInput
            style={styles.input}
            value={installmentCount}
            onChangeText={setInstallmentCount}
            keyboardType="numeric"
            placeholder="Jumlah cicilan/tagihan, contoh 12"
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
    </LinearGradient>
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
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.label,
    color: colors.textSecondary,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.text,
  },
  input: {
    minHeight: 48,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.body,
  },
  inputLabel: {
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateInput: {
    flex: 1,
  },
  toggleRow: {
    minHeight: 48,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  toggleText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  toggleValue: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '800',
  },
  saveButton: {
    minHeight: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '800',
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  billMeta: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  billRepeat: {
    color: colors.primary,
    fontSize: typography.tiny,
    marginTop: spacing.xs,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  billStatus: {
    color: colors.textSecondary,
    fontSize: typography.tiny,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  billStatusOverdue: {
    color: colors.expense,
  },
  paidButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.income,
  },
  paidButtonText: {
    color: colors.white,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
});
