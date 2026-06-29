/**
 * Add Transaction Screen
 * Form input transaksi manual.
 */

import React, {useState} from 'react';
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

export default function AddTransactionScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [saving, setSaving] = useState(false);

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
      <StatusBar barStyle="light-content" backgroundColor="#111113" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Tambah Transaksi</Text>
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

        <Field label="Nominal">
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            placeholder="Rp 50.000"
            placeholderTextColor="#737373"
          />
        </Field>

        <Field label="Catatan">
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Contoh: Makan siang"
            placeholderTextColor="#737373"
          />
        </Field>

        <Field label="Merchant / Pihak terkait">
          <TextInput
            style={styles.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Opsional"
            placeholderTextColor="#737373"
          />
        </Field>

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
  segment: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#242428',
    borderWidth: 1,
    borderColor: '#303036',
  },
  segmentButtonActive: {
    backgroundColor: '#c9152a',
    borderColor: '#c9152a',
  },
  segmentText: {
    textAlign: 'center',
    color: '#d1d5db',
    fontWeight: '700',
    fontSize: 12,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 8,
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 14,
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
    borderRadius: 8,
    backgroundColor: '#242428',
    borderWidth: 1,
    borderColor: '#303036',
  },
  categoryButtonActive: {
    backgroundColor: '#1f3d2a',
    borderColor: '#22c55e',
  },
  categoryText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#86efac',
  },
  saveButton: {
    marginTop: 6,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#c9152a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
