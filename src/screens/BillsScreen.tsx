/**
 * Bills Screen
 * Manajemen tagihan dan pembayaran jatuh tempo.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Modal,
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
  const [dueDate, setDueDate] = useState(startOfTodayAtNine());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(startOfMonth(startOfTodayAtNine()));
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
      const noteDueDate = buildDueDate(dueDate, index);
      return {
        id: totalInstallments === 1 ? parentId : `${parentId}-${index + 1}`,
        title: totalInstallments === 1 ? title.trim() : `${title.trim()} (${index + 1}/${totalInstallments})`,
        amount: numericAmount,
        currency: 'IDR',
        dueDate: noteDueDate,
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
      setDueDate(startOfTodayAtNine());
      setPickerMonth(startOfMonth(startOfTodayAtNine()));
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
          <Pressable style={styles.datePickerButton} onPress={() => setPickerVisible(true)}>
            <Text style={styles.datePickerText}>{formatReadableDate(dueDate)}</Text>
            <Text style={styles.datePickerAction}>Pilih</Text>
          </Pressable>
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

      <DatePickerModal
        visible={pickerVisible}
        month={pickerMonth}
        selectedDate={dueDate}
        onChangeMonth={setPickerMonth}
        onSelect={value => {
          setDueDate(value);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
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

function buildDueDate(baseDate: number, monthOffset: number): number {
  const source = new Date(baseDate);
  const date = new Date(
    source.getFullYear(),
    source.getMonth() + monthOffset,
    1,
    9,
    0,
    0,
    0,
  );
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(source.getDate(), lastDay));
  return date.getTime();
}

function startOfTodayAtNine(): number {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(9, 0, 0, 0);
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

function formatReadableDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function DatePickerModal({
  visible,
  month,
  selectedDate,
  onChangeMonth,
  onSelect,
  onClose,
}: {
  visible: boolean;
  month: number;
  selectedDate: number;
  onChangeMonth(value: number): void;
  onSelect(value: number): void;
  onClose(): void;
}) {
  const monthDate = new Date(month);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const blanks = Array.from({length: firstDay}, (_, index) => `blank-${index}`);
  const days = Array.from({length: daysInMonth}, (_, index) => index + 1);
  const monthLabel = monthDate.toLocaleDateString('id-ID', {month: 'long', year: 'numeric'});

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.dateModalSheet}>
          <View style={styles.dateModalHeader}>
            <Pressable style={styles.monthButton} onPress={() => onChangeMonth(addMonths(month, -1))}>
              <Text style={styles.monthButtonText}>{'<'}</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable style={styles.monthButton} onPress={() => onChangeMonth(addMonths(month, 1))}>
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
              const selected = sameDate(value, selectedDate);
              return (
                <Pressable
                  key={day}
                  style={[styles.dayCell, selected && styles.dayCellSelected]}
                  onPress={() => onSelect(value)}>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Tutup</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
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
  datePickerButton: {
    minHeight: 48,
    marginBottom: 10,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  datePickerAction: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(25,21,45,0.38)',
  },
  dateModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    paddingBottom: 24,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '900',
  },
  monthTitle: {
    color: colors.ink,
    fontSize: 17,
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
