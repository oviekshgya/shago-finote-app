import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import {useTransactions} from '../hooks/useTransactions';
import type {FinancialTransaction, TransactionCategory, TransactionType} from '../types/FinancialTransaction';
import {
  formatCurrency,
  formatTransactionDate,
  groupTransactionsByDate,
} from '../utils/TransactionUtils';
import {colors, radii, shadow} from '../theme/finoteTheme';
import {exportTransactions} from '../services/BackendApi';
import {buildReportPayloadFromTransactions, type ExportFormat} from '../services/ReportPayloadService';
import {FinancialStorage} from '../storage/FinancialStorage';
import type {CaptureRule} from '../types/CaptureRule';

type SourceOption = {
  label: string;
  packageName?: string;
};

const fallbackSourceOptions: SourceOption[] = [
  {label: 'Cash / Manual'},
];

export default function TransactionsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const {transactions, loading, deleteTransaction, updateTransaction} = useTransactions();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('Menyiapkan payload report...');
  const [exportEmail, setExportEmail] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [exportFormVisible, setExportFormVisible] = useState(false);
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editCategory, setEditCategory] = useState<TransactionCategory>('other');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editSource, setEditSource] = useState<SourceOption>(fallbackSourceOptions[0]);
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>(fallbackSourceOptions);

  const loadSourceOptions = useCallback(async () => {
    const rules = await FinancialStorage.getCaptureRules();
    setSourceOptions([
      ...rules.filter(rule => rule.enabled).map(ruleToSourceOption),
      ...fallbackSourceOptions,
    ]);
  }, []);

  useEffect(() => {
    loadSourceOptions().catch(() => undefined);
  }, [loadSourceOptions]);

  const filtered = transactions
    .filter(t => {
      if (filterType !== 'all' && t.type !== filterType) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          t.description.toLowerCase().includes(query) ||
          (t.merchant?.toLowerCase().includes(query) ?? false) ||
          (t.sourceApp?.toLowerCase().includes(query) ?? false) ||
          (t.sourcePackageName?.toLowerCase().includes(query) ?? false)
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

  const sourceSummary = useMemo(() => buildSourceSummary(filtered, transactions), [filtered, transactions]);

  const confirmDelete = (transaction: FinancialTransaction) => {
    Alert.alert(
      'Hapus transaksi?',
      `${transaction.description}\n${formatCurrency(transaction.amount)}`,
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              if (selectedTransaction?.id === transaction.id) {
                setSelectedTransaction(null);
              }
            } catch (error) {
              Alert.alert('Gagal menghapus transaksi', String(error));
            }
          },
        },
      ],
    );
  };

  const openExportForm = () => {
    if (filtered.length === 0) {
      Alert.alert('Tidak ada data', 'Belum ada transaksi yang bisa diexport.');
      return;
    }
    setExportFormVisible(true);
  };

  const openEditTransaction = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setEditType(transaction.type);
    setEditCategory(transaction.category);
    setEditAmount(formatRupiahInput(String(transaction.amount)));
    setEditDescription(transaction.description);
    setEditMerchant(transaction.merchant ?? '');
    setEditSource(transactionToSourceOption(transaction));
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) {
      return;
    }
    const numericAmount = Number(editAmount.replace(/[^\d]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Nominal belum valid');
      return;
    }
    if (!editDescription.trim()) {
      Alert.alert('Deskripsi wajib diisi');
      return;
    }

    try {
      await updateTransaction(editingTransaction.id, {
        type: editType,
        category: editCategory,
        amount: numericAmount,
        description: editDescription.trim(),
        merchant: editMerchant.trim() || undefined,
        sourceApp: editSource.label,
        sourcePackageName: editSource.packageName,
        isVerified: true,
      });
      setSelectedTransaction(null);
      setEditingTransaction(null);
    } catch (error) {
      Alert.alert('Gagal edit transaksi', String(error));
    }
  };

  const handleExport = async () => {
    const emailTo = parseEmailList(exportEmail);
    if (emailTo.length === 0) {
      Alert.alert('Email wajib diisi', 'Isi minimal satu email tujuan export.');
      return;
    }

    setExporting(true);
    setExportProgress('Menyiapkan payload report...');
    try {
      const payload = buildReportPayloadFromTransactions({
        transactions: filtered,
        periodType: 'all',
        format: exportFormat,
        emailTo,
      });
      setExportProgress('Mengirim report untuk diproses...');
      const result = await exportTransactions(payload);
      setExportFormVisible(false);
      setExportProgress('Report berhasil dikirim ke email.');
      Alert.alert(
        'Export berhasil',
        `${result.filename} dikirim ke ${result.sentTo.join(', ')}`,
      );
    } catch (error) {
      Alert.alert('Export gagal', String(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, {paddingTop: Math.max(insets.top, 16)}]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Insights</Text>
          <Text style={styles.title}>Spending details</Text>
          <Text style={styles.subtitle}>{filtered.length} transaksi ditemukan</Text>
        </View>
        <Pressable style={styles.exportButton} onPress={openExportForm} disabled={exporting}>
          <Text style={styles.exportButtonText}>{exporting ? 'Exporting' : 'Export'}</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <SummaryPill label="Income" value={formatCurrency(totals.income)} tone="teal" />
        <SummaryPill label="Expense" value={formatCurrency(totals.expense)} tone="pink" />
      </View>

      <SourceSummaryCard sources={sourceSummary} onPress={() => setSourceModalVisible(true)} />

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
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onPress={() => setSelectedTransaction(transaction)}
                    onEdit={() => openEditTransaction(transaction)}
                    onDelete={() => confirmDelete(transaction)}
                  />
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
      <TransactionEditModal
        transaction={editingTransaction}
        type={editType}
        category={editCategory}
        amount={editAmount}
        description={editDescription}
        merchant={editMerchant}
        source={editSource}
        sourceOptions={sourceOptions}
        onChangeType={setEditType}
        onChangeCategory={setEditCategory}
        onChangeAmount={value => setEditAmount(formatRupiahInput(value))}
        onChangeDescription={setEditDescription}
        onChangeMerchant={setEditMerchant}
        onChangeSource={setEditSource}
        onClose={() => setEditingTransaction(null)}
        onSubmit={handleSaveEdit}
      />
      <SourceSummaryModal
        visible={sourceModalVisible}
        sources={sourceSummary}
        onClose={() => setSourceModalVisible(false)}
      />
      <ExportFormModal
        visible={exportFormVisible}
        email={exportEmail}
        format={exportFormat}
        onChangeEmail={setExportEmail}
        onChangeFormat={setExportFormat}
        onClose={() => setExportFormVisible(false)}
        onSubmit={handleExport}
      />
      <ExportLoadingModal visible={exporting} progressText={exportProgress} />
    </View>
  );
}

function parseEmailList(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function formatRupiahInput(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) {
    return '';
  }
  return `Rp ${Number(digits).toLocaleString('id-ID')}`;
}

function ExportFormModal({
  visible,
  email,
  format,
  onChangeEmail,
  onChangeFormat,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  email: string;
  format: ExportFormat;
  onChangeEmail(value: string): void;
  onChangeFormat(value: ExportFormat): void;
  onClose(): void;
  onSubmit(): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalEyebrow}>Export report</Text>
          <Text style={styles.modalTitle}>Kirim laporan ke email</Text>
          <Text style={styles.exportFormHint}>
            File laporan akan dibuat dan dikirim ke alamat email tujuan.
          </Text>

          <Text style={styles.exportFormLabel}>Format file</Text>
          <View style={styles.exportFormatRow}>
            {(['excel', 'pdf'] as const).map(item => (
              <Pressable
                key={item}
                style={[styles.exportFormatButton, format === item && styles.exportFormatButtonActive]}
                onPress={() => onChangeFormat(item)}>
                <Text
                  style={[
                    styles.exportFormatText,
                    format === item && styles.exportFormatTextActive,
                  ]}>
                  {item === 'excel' ? 'Excel' : 'PDF'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.exportFormLabel}>Email tujuan</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="nama@email.com, finance@email.com"
            placeholderTextColor={colors.faint}
            value={email}
            onChangeText={onChangeEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.exportFormActions}>
            <Pressable style={styles.exportCancelButton} onPress={onClose}>
              <Text style={styles.exportCancelText}>Batal</Text>
            </Pressable>
            <Pressable style={styles.exportSubmitButton} onPress={onSubmit}>
              <Text style={styles.exportSubmitText}>Kirim</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ExportLoadingModal({
  visible,
  progressText,
}: {
  visible: boolean;
  progressText: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.loadingBackdrop}>
        <View style={styles.exportModal}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.exportModalTitle}>Export report</Text>
          <Text style={styles.exportModalText}>{progressText}</Text>
          <View style={styles.exportProgressTrack}>
            <View style={styles.exportProgressFill} />
          </View>
        </View>
      </View>
    </Modal>
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

type SourceSummaryItem = {
  sourceName: string;
  sourcePackageName?: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
  count: number;
};

function buildSourceSummary(
  visibleTransactions: FinancialTransaction[],
  allTransactions: FinancialTransaction[],
): SourceSummaryItem[] {
  const grouped = new Map<string, SourceSummaryItem>();

  allTransactions.forEach(transaction => {
    const sourceName = getTransactionSourceName(transaction);
    const key = buildTransactionSourceKey(transaction, sourceName);
    const current = grouped.get(key) ?? {
      sourceName,
      sourcePackageName: transaction.sourcePackageName,
      income: 0,
      expense: 0,
      net: 0,
      balance: 0,
      count: 0,
    };
    if (transaction.type === 'income') {
      current.balance += transaction.amount;
    }
    if (transaction.type === 'expense') {
      current.balance -= transaction.amount;
    }
    grouped.set(key, current);
  });

  visibleTransactions.forEach(transaction => {
    const sourceName = getTransactionSourceName(transaction);
    const key = buildTransactionSourceKey(transaction, sourceName);
    const current = grouped.get(key) ?? {
      sourceName,
      sourcePackageName: transaction.sourcePackageName,
      income: 0,
      expense: 0,
      net: 0,
      balance: 0,
      count: 0,
    };

    current.count++;
    if (transaction.type === 'income') {
      current.income += transaction.amount;
    }
    if (transaction.type === 'expense') {
      current.expense += transaction.amount;
    }
    current.net = current.income - current.expense;
    grouped.set(key, current);
  });

  return [...grouped.values()].sort((a, b) => {
    const activityDiff = (b.income + b.expense) - (a.income + a.expense);
    return activityDiff !== 0 ? activityDiff : Math.abs(b.balance) - Math.abs(a.balance);
  });
}

function getTransactionSourceName(transaction: FinancialTransaction): string {
  if (transaction.sourceApp?.trim()) {
    return transaction.sourceApp.trim();
  }
  if (transaction.sourcePackageName?.trim()) {
    return transaction.sourcePackageName.trim();
  }
  return transaction.sourceType === 'manual' ? 'Input Manual' : 'Auto Capture';
}

function buildTransactionSourceKey(transaction: FinancialTransaction, sourceName: string): string {
  return `${transaction.sourceType}:${transaction.sourcePackageName ?? sourceName}`;
}

function ruleToSourceOption(rule: CaptureRule): SourceOption {
  return {
    label: rule.appLabel,
    packageName: rule.packageName,
  };
}

function transactionToSourceOption(transaction: FinancialTransaction): SourceOption {
  return {
    label: getTransactionSourceName(transaction),
    packageName: transaction.sourcePackageName,
  };
}

function isSameSource(left: SourceOption, right: SourceOption): boolean {
  return (left.packageName ?? left.label) === (right.packageName ?? right.label);
}

function SourceSummaryCard({
  sources,
  onPress,
}: {
  sources: SourceSummaryItem[];
  onPress(): void;
}) {
  if (sources.length === 0) {
    return null;
  }
  const totals = sources.reduce(
    (acc, item) => ({
      balance: acc.balance + item.balance,
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
    }),
    {balance: 0, income: 0, expense: 0},
  );

  return (
    <Pressable style={styles.sourceSummaryCard} onPress={onPress}>
      <View style={styles.sourceSummaryHeader}>
        <View>
          <Text style={styles.sourceSummaryTitle}>Transaksi per source</Text>
          <Text style={styles.sourceSummarySubtitle}>{sources.length} source aktif, tekan untuk detail</Text>
        </View>
        <Text style={styles.sourceSummaryChevron}>›</Text>
      </View>
      <View style={styles.sourceCompactGrid}>
        <View style={styles.sourceCompactBox}>
          <Text style={styles.sourceCompactLabel}>Saldo</Text>
          <Text style={styles.sourceCompactValue}>{formatCurrency(totals.balance)}</Text>
        </View>
        <View style={styles.sourceCompactBox}>
          <Text style={styles.sourceCompactLabel}>Masuk</Text>
          <Text style={[styles.sourceCompactValue, styles.sourceSummaryIncome]}>{formatCurrency(totals.income)}</Text>
        </View>
        <View style={styles.sourceCompactBox}>
          <Text style={styles.sourceCompactLabel}>Keluar</Text>
          <Text style={[styles.sourceCompactValue, styles.sourceSummaryExpense]}>{formatCurrency(totals.expense)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SourceSummaryModal({
  visible,
  sources,
  onClose,
}: {
  visible: boolean;
  sources: SourceSummaryItem[];
  onClose(): void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalEyebrow}>Source summary</Text>
          <Text style={styles.modalTitle}>Transaksi per source</Text>
          <ScrollView style={styles.sourceModalList} showsVerticalScrollIndicator={false}>
            {sources.map(source => (
              <View key={`${source.sourcePackageName ?? source.sourceName}`} style={styles.sourceSummaryRow}>
                <View style={styles.sourceSummaryAvatar}>
                  <Text style={styles.sourceSummaryAvatarText}>{source.sourceName.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.sourceSummaryCopy}>
                  <Text style={styles.sourceSummaryName} numberOfLines={1}>{source.sourceName}</Text>
                  <Text style={styles.sourceSummaryMeta}>{source.count} transaksi periode ini</Text>
                  {source.sourcePackageName ? (
                    <Text style={styles.sourceSummaryPackage} numberOfLines={1}>{source.sourcePackageName}</Text>
                  ) : null}
                </View>
                <View style={styles.sourceSummaryAmounts}>
                  <Text style={styles.sourceSummaryBalance}>Saldo {formatCurrency(source.balance)}</Text>
                  <Text style={styles.sourceSummaryIncome}>+{formatCurrency(source.income)}</Text>
                  <Text style={styles.sourceSummaryExpense}>-{formatCurrency(source.expense)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Tutup</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TransactionItem({
  transaction,
  onPress,
  onEdit,
  onDelete,
}: {
  transaction: FinancialTransaction;
  onPress(): void;
  onEdit(): void;
  onDelete(): void;
}) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.teal : colors.red;
  const initial = (transaction.merchant || transaction.description || '?').slice(0, 1).toUpperCase();

  return (
    <Pressable style={styles.transactionItem} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionTime}>{formatTransactionDate(transaction.date)}</Text>
        <Text style={styles.transactionSource} numberOfLines={1}>
          {getTransactionSourceName(transaction)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, {color: amountColor}]} numberOfLines={1}>
        {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
      </Text>
      <Pressable
        style={styles.editButton}
        onPress={event => {
          event.stopPropagation();
          onEdit();
        }}>
        <Text style={styles.editButtonText}>Edit</Text>
      </Pressable>
      <Pressable
        style={styles.deleteButton}
        onPress={event => {
          event.stopPropagation();
          onDelete();
        }}>
        <Text style={styles.deleteButtonText}>Hapus</Text>
      </Pressable>
    </Pressable>
  );
}

const editableCategories: TransactionCategory[] = [
  'salary',
  'bonus',
  'freelance',
  'investment',
  'food',
  'transport',
  'shopping',
  'utilities',
  'entertainment',
  'healthcare',
  'education',
  'subscription',
  'other',
];

function TransactionEditModal({
  transaction,
  type,
  category,
  amount,
  description,
  merchant,
  source,
  sourceOptions,
  onChangeType,
  onChangeCategory,
  onChangeAmount,
  onChangeDescription,
  onChangeMerchant,
  onChangeSource,
  onClose,
  onSubmit,
}: {
  transaction: FinancialTransaction | null;
  type: TransactionType;
  category: TransactionCategory;
  amount: string;
  description: string;
  merchant: string;
  source: SourceOption;
  sourceOptions: SourceOption[];
  onChangeType(value: TransactionType): void;
  onChangeCategory(value: TransactionCategory): void;
  onChangeAmount(value: string): void;
  onChangeDescription(value: string): void;
  onChangeMerchant(value: string): void;
  onChangeSource(value: SourceOption): void;
  onClose(): void;
  onSubmit(): void;
}) {
  return (
    <Modal visible={Boolean(transaction)} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalEyebrow}>Edit transaction</Text>
            <Text style={styles.modalTitle}>Ubah detail transaksi</Text>

            <Text style={styles.editLabel}>Tipe</Text>
            <View style={styles.editSegment}>
              {(['income', 'expense'] as const).map(item => (
                <Pressable
                  key={item}
                  style={[styles.editSegmentButton, type === item && styles.editSegmentButtonActive]}
                  onPress={() => onChangeType(item)}>
                  <Text
                    style={[
                      styles.editSegmentText,
                      type === item && styles.editSegmentTextActive,
                    ]}>
                    {item === 'income' ? 'Masuk' : 'Keluar'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.editLabel}>Nominal</Text>
            <TextInput
              style={styles.editInput}
              value={amount}
              onChangeText={onChangeAmount}
              keyboardType="numeric"
              placeholder="Rp 10.000"
              placeholderTextColor={colors.faint}
            />

            <Text style={styles.editLabel}>Deskripsi</Text>
            <TextInput
              style={styles.editInput}
              value={description}
              onChangeText={onChangeDescription}
              placeholder="Deskripsi transaksi"
              placeholderTextColor={colors.faint}
            />

            <Text style={styles.editLabel}>Merchant</Text>
            <TextInput
              style={styles.editInput}
              value={merchant}
              onChangeText={onChangeMerchant}
              placeholder="Nama merchant atau sumber"
              placeholderTextColor={colors.faint}
            />

            <Text style={styles.editLabel}>Source</Text>
            <View style={styles.sourcePickerGrid}>
              {sourceOptions.map(item => (
                <Pressable
                  key={item.packageName ?? item.label}
                  style={[
                    styles.sourcePickerButton,
                    isSameSource(source, item) && styles.sourcePickerButtonActive,
                  ]}
                  onPress={() => onChangeSource(item)}>
                  <Text
                    style={[
                      styles.sourcePickerText,
                      isSameSource(source, item) && styles.sourcePickerTextActive,
                    ]}>
                    {item.label}
                  </Text>
                  {item.packageName ? (
                    <Text
                      style={[
                        styles.sourcePickerPackage,
                        isSameSource(source, item) && styles.sourcePickerPackageActive,
                      ]}
                      numberOfLines={1}>
                      {item.packageName}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>

            <Text style={styles.editLabel}>Kategori</Text>
            <View style={styles.categoryWrap}>
              {editableCategories.map(item => (
                <Pressable
                  key={item}
                  style={[styles.categoryChip, category === item && styles.categoryChipActive]}
                  onPress={() => onChangeCategory(item)}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === item && styles.categoryChipTextActive,
                    ]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.editActions}>
            <Pressable style={styles.editCancelButton} onPress={onClose}>
              <Text style={styles.editCancelText}>Batal</Text>
            </Pressable>
            <Pressable style={styles.editSaveButton} onPress={onSubmit}>
              <Text style={styles.editSaveText}>Simpan</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: FinancialTransaction | null;
  onClose(): void;
}) {
  const isIncome = transaction?.type === 'income';
  const amountColor = isIncome ? colors.teal : colors.red;

  return (
    <Modal visible={Boolean(transaction)} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalEyebrow}>Transaction detail</Text>
            <Text style={styles.modalTitle}>{transaction?.description || '-'}</Text>
            <Text style={[styles.modalAmount, {color: amountColor}]}>
              {transaction ? `${isIncome ? '+' : '-'} ${formatCurrency(transaction.amount)}` : '-'}
            </Text>

            <View style={styles.detailCard}>
              <DetailRow label="Tipe" value={transaction?.type ?? '-'} />
              <DetailRow label="Status" value={transaction?.status ?? '-'} />
              <DetailRow label="Kategori" value={transaction?.category ?? '-'} />
              <DetailRow label="Tanggal transaksi" value={transaction ? formatTransactionDate(transaction.date) : '-'} />
              <DetailRow label="Merchant" value={transaction?.merchant ?? '-'} />
              <DetailRow label="Sumber" value={transaction ? getTransactionSourceName(transaction) : '-'} />
              <DetailRow label="Package" value={transaction?.sourcePackageName ?? '-'} />
              <DetailRow label="Referensi" value={transaction?.reference ?? '-'} />
              <DetailRow label="Sync" value={transaction?.syncStatus ?? '-'} />
              <DetailRow label="Dibuat" value={transaction ? formatTransactionDate(transaction.createdAt) : '-'} />
              <DetailRow label="Diupdate" value={transaction ? formatTransactionDate(transaction.updatedAt) : '-'} />
            </View>
          </ScrollView>

          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Tutup</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCopy: {
    flex: 1,
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
  exportButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
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
  sourceSummaryCard: {
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  sourceSummaryHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sourceSummaryTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  sourceSummarySubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  sourceSummaryChevron: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  sourceCompactGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceCompactBox: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 9,
    justifyContent: 'center',
  },
  sourceCompactLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  sourceCompactValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  sourceModalList: {
    marginTop: 12,
    maxHeight: 430,
  },
  sourceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourceSummaryAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceSummaryAvatarText: {
    color: colors.primary,
    fontWeight: '900',
  },
  sourceSummaryCopy: {
    flex: 1,
  },
  sourceSummaryName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  sourceSummaryMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  sourceSummaryPackage: {
    marginTop: 2,
    color: colors.faint,
    fontSize: 10,
    fontWeight: '700',
  },
  sourceSummaryAmounts: {
    alignItems: 'flex-end',
    minWidth: 112,
  },
  sourceSummaryBalance: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
  },
  sourceSummaryIncome: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: '900',
  },
  sourceSummaryExpense: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
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
  emailInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    minHeight: 48,
    color: colors.ink,
    marginBottom: 10,
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
  transactionSource: {
    marginTop: 2,
    fontSize: 10,
    color: colors.primary,
    fontWeight: '800',
  },
  transactionAmount: {
    maxWidth: 92,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  editButton: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  deleteButton: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: radii.md,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalSheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  modalAmount: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '900',
  },
  exportFormHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 16,
  },
  exportFormLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  exportFormatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  exportFormatButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportFormatButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  exportFormatText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  exportFormatTextActive: {
    color: colors.surface,
  },
  exportFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  exportCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportCancelText: {
    color: colors.ink,
    fontWeight: '900',
  },
  exportSubmitButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportSubmitText: {
    color: colors.surface,
    fontWeight: '900',
  },
  detailCard: {
    marginTop: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  editLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 8,
  },
  editInput: {
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 14,
  },
  editSegment: {
    flexDirection: 'row',
    gap: 8,
  },
  editSegmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSegmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  editSegmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  editSegmentTextActive: {
    color: colors.surface,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  sourcePickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  sourcePickerButton: {
    minWidth: '46%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourcePickerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sourcePickerText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  sourcePickerTextActive: {
    color: colors.surface,
  },
  sourcePickerPackage: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 138,
  },
  sourcePickerPackageActive: {
    color: '#ddd5ff',
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  categoryChipTextActive: {
    color: colors.surface,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: {
    color: colors.ink,
    fontWeight: '900',
  },
  editSaveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveText: {
    color: colors.surface,
    fontWeight: '900',
  },
  detailRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  detailValue: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
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
  loadingBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25,21,45,0.38)',
    padding: 24,
  },
  exportModal: {
    width: '100%',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportModalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 14,
  },
  exportModalText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  exportProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSoft,
    marginTop: 16,
    overflow: 'hidden',
  },
  exportProgressFill: {
    width: '72%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
