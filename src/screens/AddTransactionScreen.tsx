/**
 * Add Transaction Screen
 * Form input transaksi manual.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import type {FinancialTransaction, TransactionCategory, TransactionType} from '../types/FinancialTransaction';
import {colors, radii, shadow} from '../theme/finoteTheme';
import type {CaptureRule} from '../types/CaptureRule';

const categories: Array<{value: TransactionCategory; label: string}> = [
  {value: 'food', label: 'Makanan'},
  {value: 'transport', label: 'Transportasi'},
  {value: 'shopping', label: 'Belanja'},
  {value: 'utilities', label: 'Tagihan'},
  {value: 'salary', label: 'Gaji'},
  {value: 'bonus', label: 'Bonus'},
  {value: 'freelance', label: 'Freelance'},
  {value: 'investment', label: 'Investasi'},
  {value: 'healthcare', label: 'Kesehatan'},
  {value: 'education', label: 'Pendidikan'},
  {value: 'subscription', label: 'Langganan'},
  {value: 'other', label: 'Lainnya'},
];

type SourceOption = {
  label: string;
  packageName?: string;
};

const fallbackSourceOptions: SourceOption[] = [
  {label: 'Cash / Manual'},
];

export default function AddTransactionScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [source, setSource] = useState<SourceOption>(fallbackSourceOptions[0]);
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>(fallbackSourceOptions);
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [saving, setSaving] = useState(false);

  const loadSourceOptions = useCallback(async () => {
    const rules = await FinancialStorage.getCaptureRules();
    const activeSources = rules
      .filter(rule => rule.enabled)
      .map(ruleToSourceOption);
    setSourceOptions([...activeSources, ...fallbackSourceOptions]);
    if (source.packageName && !activeSources.some(item => item.packageName === source.packageName)) {
      setSource(fallbackSourceOptions[0]);
    }
  }, [source.packageName]);

  useEffect(() => {
    loadSourceOptions().catch(() => undefined);
  }, [loadSourceOptions]);

  const handleAmountChange = (value: string) => {
    setAmount(formatRupiahInput(value));
  };

  const saveTransaction = async () => {
    const numericAmount = Number(amount.replace(/[^\d]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Nominal belum valid', 'Masukkan nominal transaksi lebih dari 0.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Catatan wajib diisi', 'Masukkan judul atau catatan transaksi.');
      return;
    }
    const now = Date.now();
    const transaction: FinancialTransaction = {
      id: `manual-${now}`,
      sourceType: 'manual',
      sourceApp: source.label,
      sourcePackageName: source.packageName,
      type,
      status: 'completed',
      category,
      amount: numericAmount,
      currency: 'IDR',
      description: description.trim(),
      merchant: merchant.trim() || undefined,
      date: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      isVerified: true,
    };

    setSaving(true);
    try {
      await FinancialStorage.addTransaction(transaction);
      setAmount('');
      setDescription('');
      setMerchant('');
      setSource(fallbackSourceOptions[0]);
      setCategory('other');
      setType('expense');
      Alert.alert('Transaksi tersimpan', 'Transaksi manual berhasil ditambahkan.');
    } catch (error) {
      Alert.alert('Gagal menyimpan', String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {paddingTop: Math.max(insets.top, 16)}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Record</Text>
          <Text style={styles.title}>Add transaction</Text>
          <Text style={styles.subtitle}>Catat pemasukan atau pengeluaran manual.</Text>
        </View>

        <View style={styles.segment}>
          {(['expense', 'income', 'transfer'] as const).map(item => (
            <Pressable
              key={item}
              style={[styles.segmentButton, type === item && styles.segmentButtonActive]}
              onPress={() => setType(item)}>
              <Text style={[styles.segmentText, type === item && styles.segmentTextActive]}>
                {item === 'expense' ? 'Keluar' : item === 'income' ? 'Masuk' : 'Transfer'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            placeholder="Rp 50.000"
            placeholderTextColor="#d6ccff"
          />
        </View>

        <Field label="Catatan">
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Contoh: Makan siang"
            placeholderTextColor={colors.faint}
          />
        </Field>

        <Field label="Merchant / Pihak terkait">
          <TextInput
            style={styles.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Opsional"
            placeholderTextColor={colors.faint}
          />
        </Field>

        <Text style={styles.fieldLabel}>Source</Text>
        <View style={styles.sourceGrid}>
          {sourceOptions.map(item => (
            <Pressable
              key={item.packageName ?? item.label}
              style={[
                styles.sourceButton,
                isSameSource(source, item) && styles.sourceButtonActive,
              ]}
              onPress={() => setSource(item)}>
              <Text
                style={[
                  styles.sourceText,
                  isSameSource(source, item) && styles.sourceTextActive,
                ]}>
                {item.label}
              </Text>
              {item.packageName ? (
                <Text
                  style={[
                    styles.sourcePackage,
                    isSameSource(source, item) && styles.sourcePackageActive,
                  ]}
                  numberOfLines={1}>
                  {item.packageName}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Kategori</Text>
        <View style={styles.categoryGrid}>
          {categories.map(item => (
            <Pressable
              key={item.value}
              style={[styles.categoryButton, category === item.value && styles.categoryButtonActive]}
              onPress={() => setCategory(item.value)}>
              <Text style={[styles.categoryText, category === item.value && styles.categoryTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveTransaction}
          disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Menyimpan...' : 'Simpan Transaksi'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function formatRupiahInput(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) {
    return '';
  }
  return `Rp ${Number(digits).toLocaleString('id-ID')}`;
}

function ruleToSourceOption(rule: CaptureRule): SourceOption {
  return {
    label: rule.appLabel,
    packageName: rule.packageName,
  };
}

function isSameSource(left: SourceOption, right: SourceOption): boolean {
  return (left.packageName ?? left.label) === (right.packageName ?? right.label);
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
  segment: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  amountCard: {
    padding: 18,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    marginBottom: 16,
    ...shadow,
  },
  amountLabel: {
    color: '#ded8ff',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  amountInput: {
    minHeight: 54,
    color: colors.surface,
    fontSize: 30,
    fontWeight: '900',
    padding: 0,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 8,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 14,
  },
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  sourceButton: {
    minWidth: '46%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sourceText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  sourceTextActive: {
    color: colors.surface,
  },
  sourcePackage: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 142,
  },
  sourcePackageActive: {
    color: '#ddd5ff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  categoryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  categoryTextActive: {
    color: colors.teal,
  },
  saveButton: {
    marginTop: 6,
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
});
