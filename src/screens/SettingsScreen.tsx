/**
 * Settings Screen
 * Pengaturan listener, privasi, dan data lokal.
 * UI bersih dengan section yang terorganisir rapi.
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
  Switch,
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
import NotificationModule from '../native/NotificationModule';
import {FinancialStorage} from '../storage/FinancialStorage';
import {TransactionCaptureService} from '../services/TransactionCaptureService';
import {SettingSection} from '../components/SettingSection';
import {Card} from '../components/Card';
import type {CaptureFilter, InstalledApp} from '../types/NotificationLog';
import type {CaptureRule} from '../types/CaptureRule';

export default function SettingsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [listenerEnabled, setListenerEnabled] = useState(false);
  const [rawCount, setRawCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [billCount, setBillCount] = useState(0);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [captureRules, setCaptureRules] = useState<CaptureRule[]>([]);
  const [captureFilter, setCaptureFilter] = useState<CaptureFilter>({captureAll: false, packages: []});
  const [appSearch, setAppSearch] = useState('');
  const [editingRule, setEditingRule] = useState<CaptureRule | null>(null);
  const [incomeDraft, setIncomeDraft] = useState('');
  const [expenseDraft, setExpenseDraft] = useState('');
  const [addSourceVisible, setAddSourceVisible] = useState(false);

  const refresh = useCallback(async () => {
    const [enabled, rawLogs, transactions, bills, appsJson, filterJson, rules] = await Promise.all([
      NotificationModule.isListenerEnabled(),
      NotificationModule.getLogs(),
      FinancialStorage.getAllTransactions(),
      FinancialStorage.getAllDueDates(),
      NotificationModule.getInstalledApps(),
      NotificationModule.getCaptureFilter(),
      FinancialStorage.getCaptureRules(),
    ]);
    setListenerEnabled(enabled);
    setRawCount(JSON.parse(rawLogs || '[]').length);
    setTransactionCount(transactions.length);
    setBillCount(bills.length);
    setInstalledApps(JSON.parse(appsJson || '[]'));
    const parsedFilter = JSON.parse(filterJson || '{"captureAll":false,"packages":[]}') as CaptureFilter;
    if (parsedFilter.captureAll) {
      const normalizedFilter = {
        captureAll: false,
        packages: rules.filter(rule => rule.enabled).map(rule => rule.packageName),
      };
      await NotificationModule.saveCaptureFilter(JSON.stringify(normalizedFilter));
      setCaptureFilter(normalizedFilter);
    } else {
      setCaptureFilter(parsedFilter);
    }
    setCaptureRules(rules);
  }, []);

  useEffect(() => {
    refresh().catch(error => Alert.alert('Gagal memuat pengaturan', String(error)));
  }, [refresh]);

  const openNotificationAccess = () => {
    Alert.alert(
      'Aktifkan Notification Access',
      'Shago Finote membaca notifikasi transaksi setelah Anda mengaktifkan akses manual di Android Settings.',
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Buka Settings',
          onPress: () => NotificationModule.openSettings().catch(error => Alert.alert('Gagal membuka settings', String(error))),
        },
      ],
    );
  };

  const clearRawLogs = () => {
    Alert.alert('Hapus raw notification?', 'Transaksi yang sudah tersimpan tidak ikut dihapus.', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await NotificationModule.clearLogs();
          await refresh();
        },
      },
    ]);
  };

  const clearAllLocalData = () => {
    Alert.alert('Hapus semua data lokal?', 'Transaksi, tagihan, budget, dan cache parser akan dihapus.', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Hapus Semua',
        style: 'destructive',
        onPress: async () => {
          await FinancialStorage.clearAllData();
          await refresh();
        },
      },
    ]);
  };

  const saveNativeFilter = async (rules: CaptureRule[]) => {
    const nextFilter: CaptureFilter = {
      captureAll: false,
      packages: rules.filter(rule => rule.enabled).map(rule => rule.packageName),
    };
    await NotificationModule.saveCaptureFilter(JSON.stringify(nextFilter));
    setCaptureFilter(nextFilter);
  };

  const syncPendingNotifications = async () => {
    const result = await TransactionCaptureService.syncFromNotificationModule(NotificationModule);
    if (result.captured > 0) {
      DeviceEventEmitter.emit('transactionsUpdated');
    }
    await refresh();
  };

  const enableApp = async (app: InstalledApp) => {
    const nextRules = [
      ...captureRules.filter(rule => rule.packageName !== app.packageName),
      {
        packageName: app.packageName,
        appLabel: app.label,
        enabled: true,
        incomePrefixes: defaultIncomePrefixes(app.label),
        expensePrefixes: defaultExpensePrefixes(app.label),
      },
    ];
    await FinancialStorage.saveCaptureRule(nextRules[nextRules.length - 1]);
    await saveNativeFilter(nextRules);
    setCaptureRules(nextRules);
    await syncPendingNotifications();
  };

  const disableApp = async (packageName: string) => {
    const nextRules = captureRules.map(rule =>
      rule.packageName === packageName ? {...rule, enabled: false} : rule,
    );
    const rule = nextRules.find(item => item.packageName === packageName);
    if (rule) {
      await FinancialStorage.saveCaptureRule(rule);
    }
    await saveNativeFilter(nextRules);
    setCaptureRules(nextRules);
  };

  const updateRulePrefixes = async (
    packageName: string,
    patch: Partial<Pick<CaptureRule, 'incomePrefixes' | 'expensePrefixes'>>,
  ) => {
    const nextRules = captureRules.map(rule =>
      rule.packageName === packageName ? {...rule, ...patch, enabled: true} : rule,
    );
    const rule = nextRules.find(item => item.packageName === packageName);
    if (rule) {
      await FinancialStorage.saveCaptureRule(rule);
    }
    await saveNativeFilter(nextRules);
    setCaptureRules(nextRules);
    await syncPendingNotifications();
  };

  const openRuleModal = (rule: CaptureRule) => {
    setEditingRule(rule);
    setIncomeDraft(rule.incomePrefixes.join(', '));
    setExpenseDraft(rule.expensePrefixes.join(', '));
  };

  const saveRuleModal = async () => {
    if (!editingRule) {
      return;
    }
    await updateRulePrefixes(editingRule.packageName, {
      incomePrefixes: splitPrefixes(incomeDraft),
      expensePrefixes: splitPrefixes(expenseDraft),
    });
    setEditingRule(null);
  };

  const enabledRules = captureRules.filter(rule => rule.enabled);
  const filteredApps = installedApps
    .filter(app => !captureRules.some(rule => rule.packageName === app.packageName && rule.enabled))
    .filter(app => {
      const query = appSearch.trim().toLowerCase();
      if (!query) {
        return isLikelyFinanceApp(app);
      }
      return `${app.label} ${app.packageName}`.toLowerCase().includes(query);
    })
    .slice(0, 20);

  return (
    <View style={[styles.container, {paddingTop: Math.max(insets.top, 16)}]}>
      <StatusBar barStyle="light-content" backgroundColor="#111113" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pengaturan</Text>
          <Text style={styles.subtitle}>Konfigurasi listener, source notifikasi, dan data lokal</Text>
        </View>

        {/* Status Section */}
        <SettingSection title="Status Listener" collapsible={false}>
          <Card>
            <View style={styles.statusContent}>
              <View style={styles.statusLeft}>
                <Text style={styles.statusLabel}>Notification Listener</Text>
                <Text style={[styles.statusValue, {color: listenerEnabled ? '#4ade80' : '#f87171'}]}>
                  {listenerEnabled ? 'AKTIF' : 'BELUM AKTIF'}
                </Text>
                <Text style={styles.statusDesc}>
                  {listenerEnabled
                    ? 'Notifikasi dari source terpilih bisa diproses.'
                    : 'Aktifkan agar transaksi dari m-banking/e-wallet bisa dibaca.'}
                </Text>
              </View>
              <View style={[styles.statusIndicator, listenerEnabled ? styles.indicatorOn : styles.indicatorOff]} />
            </View>
          </Card>
          <ActionButton title="Buka Notification Access" subtitle="Aktifkan atau matikan di Android Settings" onPress={openNotificationAccess} />
        </SettingSection>

        {/* Source Notifikasi Section */}
        <SettingSection title="Pilih Sumber Notifikasi" collapsible={true} defaultOpen={enabledRules.length === 0}>
          <Card variant="primary">
            <Text style={styles.infoText}>
              Pilih aplikasi yang ingin dipantau. Atur prefix kata untuk membedakan uang masuk dan keluar.
            </Text>
            <Text style={styles.modeLabel}>
              {captureFilter.packages.length > 0 ? `${captureFilter.packages.length} app dipantau` : 'Belum ada app dipilih'}
            </Text>
          </Card>

          {/* Enabled Rules */}
          {enabledRules.length > 0 && (
            <View style={styles.enabledRulesSection}>
              <Text style={styles.enabledRulesTitle}>App Aktif ({enabledRules.length})</Text>
              {enabledRules.map(rule => (
                <ActiveSourceRow
                  key={rule.packageName}
                  rule={rule}
                  onSetup={() => openRuleModal(rule)}
                  onDisable={() => disableApp(rule.packageName)}
                />
              ))}
            </View>
          )}

          <Pressable style={styles.primaryActionButton} onPress={() => setAddSourceVisible(true)}>
            <Text style={styles.primaryActionText}>Tambah Sumber Notifikasi</Text>
          </Pressable>
        </SettingSection>

        {/* Data Local Section */}
        <SettingSection title="Data Lokal" collapsible={true} defaultOpen={false}>
          <Card variant="primary">
            <View style={styles.dataGrid}>
              <DataBox label="Raw notif" value={rawCount.toString()} />
              <DataBox label="Transaksi" value={transactionCount.toString()} />
              <DataBox label="Tagihan" value={billCount.toString()} />
            </View>
          </Card>
          <ActionButton title="Hapus Raw Notification" subtitle="Membersihkan log mentah listener" danger onPress={clearRawLogs} />
          <ActionButton title="Hapus Semua Data" subtitle="Reset data finance di perangkat ini" danger onPress={clearAllLocalData} />
        </SettingSection>

        {/* Privacy Section */}
        <SettingSection title="Privasi & Keamanan" collapsible={true} defaultOpen={false}>
          <Card variant="accent">
            <Text style={styles.privacyText}>
              ✓ Data disimpan lokal di perangkat Anda{'\n'}
              ✓ Tidak ada data dikirim ke server tanpa izin{'\n'}
              ✓ Raw notification hanya untuk proses internal{'\n'}
              ✓ Hapus data kapan saja
            </Text>
          </Card>
        </SettingSection>
      </ScrollView>

      <Modal
        visible={Boolean(editingRule)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingRule(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Setup Prefix</Text>
            <Text style={styles.modalSubtitle}>{editingRule?.appLabel}</Text>

            <Text style={styles.inputLabel}>Prefix uang masuk</Text>
            <TextInput
              style={styles.ruleInput}
              value={incomeDraft}
              onChangeText={setIncomeDraft}
              placeholder="menerima, diterima, uang masuk"
              placeholderTextColor="#737373"
              multiline
            />

            <Text style={styles.inputLabel}>Prefix uang keluar</Text>
            <TextInput
              style={styles.ruleInput}
              value={expenseDraft}
              onChangeText={setExpenseDraft}
              placeholder="pembayaran, bayar, transfer ke"
              placeholderTextColor="#737373"
              multiline
            />
            <Text style={styles.ruleHint}>Pisahkan prefix dengan koma. Nominal Rp/IDR dibaca otomatis dari notifikasi.</Text>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={() => setEditingRule(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.modalSaveButton} onPress={saveRuleModal}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addSourceVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddSourceVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetTall}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Tambah Sumber</Text>
                <Text style={styles.modalSubtitle}>Pilih app bank/e-wallet yang notifikasinya dipantau</Text>
              </View>
              <Pressable style={styles.modalCloseButton} onPress={() => setAddSourceVisible(false)}>
                <Text style={styles.modalCloseText}>x</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              value={appSearch}
              onChangeText={setAppSearch}
              placeholder="Cari: BCA, DANA, OVO, GoPay, Gojek..."
              placeholderTextColor="#737373"
              autoFocus
            />

            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredApps.length > 0 ? (
                filteredApps.map(app => (
                  <Pressable
                    key={app.packageName}
                    style={styles.appRow}
                    onPress={async () => {
                      await enableApp(app);
                      setAppSearch('');
                      setAddSourceVisible(false);
                    }}>
                    <View style={styles.appRowText}>
                      <Text style={styles.appLabel}>{app.label}</Text>
                      <Text style={styles.appPackage}>{app.packageName}</Text>
                    </View>
                    <Text style={styles.addSourceText}>Pilih</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.noAppsText}>App tidak ditemukan</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({
  title,
  subtitle,
  danger,
  onPress,
}: {
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  );
}

function ActiveSourceRow({
  rule,
  onSetup,
  onDisable,
}: {
  rule: CaptureRule;
  onSetup(): void;
  onDisable(): void;
}) {
  return (
    <View style={styles.activeSourceRow}>
      <View style={styles.actionTextWrap}>
        <Text style={styles.ruleTitle}>{rule.appLabel}</Text>
        <Text style={styles.appPackage}>{rule.packageName}</Text>
        <Text style={styles.prefixSummary}>
          Masuk {rule.incomePrefixes.length} prefix | Keluar {rule.expensePrefixes.length} prefix
        </Text>
      </View>
      <View style={styles.sourceActions}>
        <Pressable style={styles.setupButton} onPress={onSetup}>
          <Text style={styles.setupButtonText}>Atur</Text>
        </Pressable>
        <Pressable style={styles.disableButton} onPress={onDisable}>
          <Text style={styles.disableButtonText}>Matikan</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DataBox({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.dataBox}>
      <Text style={styles.dataValue}>{value}</Text>
      <Text style={styles.dataLabel}>{label}</Text>
    </View>
  );
}

function splitPrefixes(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function defaultIncomePrefixes(label: string): string[] {
  const lower = label.toLowerCase();
  if (lower.includes('gopay') || lower.includes('gojek')) {
    return ['menerima', 'diterima', 'top up berhasil', 'saldo masuk', 'uang masuk'];
  }
  return ['masuk', 'diterima', 'menerima', 'terima', 'kredit', 'top up berhasil'];
}

function defaultExpensePrefixes(label: string): string[] {
  const lower = label.toLowerCase();
  if (lower.includes('gopay') || lower.includes('gojek')) {
    return ['pembayaran', 'bayar', 'transaksi berhasil', 'transfer ke', 'dikirim'];
  }
  return ['keluar', 'debit', 'debet', 'pembayaran', 'bayar', 'transfer ke', 'transaksi berhasil'];
}

function isLikelyFinanceApp(app: InstalledApp): boolean {
  const text = `${app.label} ${app.packageName}`.toLowerCase();
  return /bank|bca|bri|bni|mandiri|bsi|jenius|blu|dana|ovo|gopay|gojek|shopee|linkaja|wallet|pay|fin|mobile/.test(text);
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '700',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 12,
    color: '#d1d5db',
    lineHeight: 17,
  },
  statusIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 12,
  },
  indicatorOn: {
    backgroundColor: '#14532d',
  },
  indicatorOff: {
    backgroundColor: '#4b1d1d',
  },
  infoText: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  modeLabel: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '800',
  },
  enabledRulesSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  enabledRulesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchSection: {
    marginTop: 12,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchInput: {
    minHeight: 44,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  primaryActionButton: {
    minHeight: 48,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#c9152a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  appList: {
    marginBottom: 12,
  },
  appRow: {
    minHeight: 54,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appRowText: {
    flex: 1,
    marginRight: 12,
  },
  appLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  appPackage: {
    color: '#9ca3af',
    fontSize: 11,
  },
  addSourceText: {
    color: '#86efac',
    fontSize: 16,
    fontWeight: '800',
  },
  noAppsText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionButton: {
    minHeight: 58,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  actionChevron: {
    color: '#9ca3af',
    fontSize: 20,
    marginLeft: 12,
  },
  dangerText: {
    color: '#f87171',
  },
  activeSourceRow: {
    minHeight: 68,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ruleTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  prefixSummary: {
    marginTop: 4,
    color: '#86efac',
    fontSize: 11,
    fontWeight: '700',
  },
  sourceActions: {
    flexDirection: 'row',
    gap: 6,
  },
  setupButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1d4ed8',
  },
  setupButtonText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
  },
  disableButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#4b1d1d',
  },
  disableButtonText: {
    color: '#fecaca',
    fontSize: 11,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#f3f4f6',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  ruleInput: {
    minHeight: 52,
    marginBottom: 10,
    borderRadius: 6,
    backgroundColor: '#1a1a1e',
    borderWidth: 1,
    borderColor: '#303036',
    paddingHorizontal: 10,
    color: '#ffffff',
    fontSize: 12,
    textAlignVertical: 'top',
  },
  ruleHint: {
    color: '#9ca3af',
    fontSize: 11,
    lineHeight: 16,
  },
  dataGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  dataBox: {
    flex: 1,
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  dataLabel: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 11,
  },
  privacyText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  modalSheetTall: {
    maxHeight: '82%',
    padding: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  modalList: {
    maxHeight: 420,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: '#9ca3af',
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#e5e7eb',
    fontWeight: '800',
  },
  modalSaveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#c9152a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
