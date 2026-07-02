/**
 * Goals Screen
 * Setup target tabungan tanpa memotong saldo atau membuat tagihan.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  DeviceEventEmitter,
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
import type {SavingsGoal} from '../types/FinancialTransaction';
import {formatCurrency, formatTransactionDate} from '../utils/TransactionUtils';
import {colors, radii, shadow} from '../theme/finoteTheme';

type GoalProgress = {
  current: number;
  progress: number;
  achieved: boolean;
  remaining: number;
};

export default function BillsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [savingBalance, setSavingBalance] = useState(0);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(startOfDay(Date.now()));
  const [endDate, setEndDate] = useState(endOfDay(Date.now()));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(startOfMonth(Date.now()));
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [goalProgressMap, setGoalProgressMap] = useState<Record<string, GoalProgress>>({});
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    const [data, summary] = await Promise.all([
      FinancialStorage.getAllGoals(),
      FinancialStorage.calculateFinancialSummary('all'),
    ]);
    const activeGoals = data
      .filter(goal => !goal.isArchived)
      .sort((a, b) => getGoalStartDate(a) - getGoalStartDate(b));
    const progressEntries = await Promise.all(
      activeGoals.map(async goal => {
        const progress = await calculateGoalProgress(goal);
        return [goal.id, progress] as const;
      }),
    );
    setGoals(activeGoals);
    setGoalProgressMap(Object.fromEntries(progressEntries));
    setSavingBalance(Math.max(summary.netCashFlow, 0));
  }, []);

  useEffect(() => {
    loadGoals().catch(error => Alert.alert('Gagal memuat goals', String(error)));
  }, [loadGoals]);

  const saveGoal = async () => {
    const numericAmount = Number(amount.replace(/[^\d]/g, ''));
    if (!name.trim()) {
      Alert.alert('Nama goal wajib diisi');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Nominal target belum valid');
      return;
    }

    const now = Date.now();
    const goal: SavingsGoal = {
      id: `goal-${now}`,
      name: name.trim(),
      targetAmount: numericAmount,
      currency: 'IDR',
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
      createdAt: now,
      updatedAt: now,
    };

    setSaving(true);
    try {
      await FinancialStorage.addGoal(goal);
      setName('');
      setAmount('');
      setStartDate(startOfDay(Date.now()));
      setEndDate(endOfDay(Date.now()));
      setPickerMonth(startOfMonth(Date.now()));
      await loadGoals();
      DeviceEventEmitter.emit('goalsUpdated');
      Alert.alert('Goal tersimpan', 'Target tabungan berhasil ditambahkan.');
    } catch (error) {
      Alert.alert('Gagal menyimpan goal', String(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = (goal: SavingsGoal) => {
    Alert.alert('Hapus goal?', goal.name, [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await FinancialStorage.deleteGoal(goal.id);
          await loadGoals();
          DeviceEventEmitter.emit('goalsUpdated');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, {paddingTop: Math.max(insets.top, 16)}]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Goals</Text>
          <Text style={styles.title}>Savings target</Text>
          <Text style={styles.subtitle}>Atur target tabungan. Goals tidak mengurangi saldo.</Text>
        </View>

        <View style={styles.savingCard}>
          <Text style={styles.savingLabel}>Available saving</Text>
          <Text style={styles.savingAmount}>{formatCurrency(savingBalance)}</Text>
          <Text style={styles.savingHint}>Dihitung dari total uang masuk dikurangi uang keluar.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Setup goal</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nama goal, misal Dana Darurat"
            placeholderTextColor={colors.faint}
          />
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={value => setAmount(formatRupiahInput(value))}
            keyboardType="numeric"
            placeholder="Target nominal, misal Rp 1.000.000"
            placeholderTextColor={colors.faint}
          />
          <Text style={styles.inputLabel}>Target range tanggal</Text>
          <Pressable style={styles.datePickerButton} onPress={() => setPickerVisible(true)}>
            <Text style={styles.datePickerText}>{formatRangeReadable(startDate, endDate)}</Text>
            <Text style={styles.datePickerAction}>Pilih</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={saveGoal} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Menyimpan...' : 'Simpan Goal'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Goals aktif</Text>
        {goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada goals</Text>
            <Text style={styles.emptyText}>Tambahkan target tabungan agar progress tampil di Home.</Text>
          </View>
        ) : (
          goals.map(goal => (
            <GoalItem
              key={goal.id}
              goal={goal}
              progress={goalProgressMap[goal.id]}
              onDelete={() => deleteGoal(goal)}
            />
          ))
        )}
      </ScrollView>

      <DatePickerModal
        visible={pickerVisible}
        month={pickerMonth}
        startDate={startDate}
        endDate={endDate}
        mode={pickerMode}
        onChangeMonth={setPickerMonth}
        onChangeMode={setPickerMode}
        onSelect={value => {
          if (pickerMode === 'start') {
            const nextStart = startOfDay(value);
            setStartDate(nextStart);
            if (nextStart > endDate) {
              setEndDate(endOfDay(nextStart));
            }
            setPickerMode('end');
            return;
          }
          const nextEnd = endOfDay(value);
          setEndDate(nextEnd < startDate ? endOfDay(startDate) : nextEnd);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

function GoalItem({
  goal,
  progress,
  onDelete,
}: {
  goal: SavingsGoal;
  progress?: GoalProgress;
  onDelete(): void;
}) {
  const current = progress?.current ?? 0;
  const progressValue = progress?.progress ?? 0;
  const achieved = progress?.achieved ?? false;
  const remaining = progress?.remaining ?? goal.targetAmount;

  return (
    <View style={styles.goalItem}>
      <View style={styles.goalTop}>
        <View style={styles.goalCopy}>
          <Text style={styles.goalTitle}>{goal.name}</Text>
          <Text style={styles.goalMeta}>{formatRangeReadable(getGoalStartDate(goal), getGoalEndDate(goal))}</Text>
        </View>
        <Text style={[styles.goalStatus, achieved ? styles.goalStatusDone : styles.goalStatusOpen]}>
          {achieved ? 'Berhasil' : 'On progress'}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {width: `${Math.max(4, Math.round(progressValue * 100))}%`}]} />
      </View>
      <View style={styles.goalFooter}>
        <Text style={styles.goalAmount}>{formatCurrency(current)} / {formatCurrency(goal.targetAmount)}</Text>
        <Text style={styles.goalRemaining}>{remaining > 0 ? `Kurang ${formatCurrency(remaining)}` : 'Target tercapai'}</Text>
      </View>
      <Pressable style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteButtonText}>Hapus Goal</Text>
      </Pressable>
    </View>
  );
}

async function calculateGoalProgress(goal: SavingsGoal): Promise<GoalProgress> {
  const summary = await FinancialStorage.calculateFinancialSummaryByRange(
    getGoalStartDate(goal),
    getGoalEndDate(goal),
    'customRange',
  );
  const current = Math.max(summary.netCashFlow, 0);
  const progress = goal.targetAmount > 0 ? Math.min(current / goal.targetAmount, 1) : 0;
  return {
    current: Math.min(current, goal.targetAmount),
    progress,
    achieved: current >= goal.targetAmount,
    remaining: Math.max(goal.targetAmount - current, 0),
  };
}

function getGoalStartDate(goal: SavingsGoal): number {
  return startOfDay(goal.startDate ?? goal.targetDate ?? Date.now());
}

function getGoalEndDate(goal: SavingsGoal): number {
  return endOfDay(goal.endDate ?? goal.targetDate ?? Date.now());
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

function formatRangeReadable(start: number, end: number): string {
  return `${formatTransactionDate(start)} - ${formatTransactionDate(end)}`;
}

function DatePickerModal({
  visible,
  month,
  startDate,
  endDate,
  mode,
  onChangeMonth,
  onChangeMode,
  onSelect,
  onClose,
}: {
  visible: boolean;
  month: number;
  startDate: number;
  endDate: number;
  mode: 'start' | 'end';
  onChangeMonth(value: number): void;
  onChangeMode(value: 'start' | 'end'): void;
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
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.dateModalSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.rangeTabs}>
            <Pressable
              style={[styles.rangeTab, mode === 'start' && styles.rangeTabActive]}
              onPress={() => onChangeMode('start')}>
              <Text style={[styles.rangeTabLabel, mode === 'start' && styles.rangeTabLabelActive]}>Start</Text>
              <Text style={[styles.rangeTabDate, mode === 'start' && styles.rangeTabDateActive]}>{formatTransactionDate(startDate)}</Text>
            </Pressable>
            <Pressable
              style={[styles.rangeTab, mode === 'end' && styles.rangeTabActive]}
              onPress={() => onChangeMode('end')}>
              <Text style={[styles.rangeTabLabel, mode === 'end' && styles.rangeTabLabelActive]}>End</Text>
              <Text style={[styles.rangeTabDate, mode === 'end' && styles.rangeTabDateActive]}>{formatTransactionDate(endDate)}</Text>
            </Pressable>
          </View>
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
              const selected = sameDate(value, startDate) || sameDate(value, endDate);
              const inRange = value >= startOfDay(startDate) && value <= endOfDay(endDate);
              return (
                <Pressable
                  key={day}
                  style={[styles.dayCell, inRange && styles.dayCellInRange, selected && styles.dayCellSelected]}
                  onPress={() => onSelect(value)}>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Tutup</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
  savingCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    ...shadow,
  },
  savingLabel: {
    color: '#ddd5ff',
    fontSize: 12,
    fontWeight: '800',
  },
  savingAmount: {
    marginTop: 6,
    color: colors.surface,
    fontSize: 28,
    fontWeight: '900',
  },
  savingHint: {
    marginTop: 6,
    color: '#eee9ff',
    fontSize: 12,
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
    marginBottom: 14,
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
  goalItem: {
    padding: 14,
    marginBottom: 10,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  goalCopy: {
    flex: 1,
  },
  goalTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  goalMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  goalStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    fontSize: 11,
    fontWeight: '900',
  },
  goalStatusDone: {
    color: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  goalStatusOpen: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  progressTrack: {
    height: 9,
    borderRadius: 6,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.teal,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  goalAmount: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  goalRemaining: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: colors.redSoft,
  },
  deleteButtonText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
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
  rangeTabs: {
    flexDirection: 'row',
    gap: 10,
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
    fontSize: 13,
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
  modalCloseButton: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
});
