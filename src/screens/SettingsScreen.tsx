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
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import NotificationModule from '../native/NotificationModule';
import {FinancialStorage} from '../storage/FinancialStorage';
import {TransactionCaptureService} from '../services/TransactionCaptureService';
import {SettingSection} from '../components/SettingSection';
import {Card} from '../components/Card';
import type {CaptureFilter, InstalledApp} from '../types/NotificationLog';
import type {CaptureRule} from '../types/CaptureRule';
import {colors, radii} from '../theme/finoteTheme';

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Help</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Konfigurasi listener, source notifikasi, dan data lokal</Text>
        </View>

        {/* Status Section */}
        <SettingSection title="Status Listener" collapsible={false}>
          <Card>
            <View style={styles.statusContent}>
              <View style={styles.statusLeft}>
                <Text style={styles.statusLabel}>Notification Listener</Text>
                <Text style={[styles.statusValue, {color: listenerEnabled ? colors.teal : colors.red}]}>
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
              placeholderTextColor={colors.faint}
              multiline
            />

            <Text style={styles.inputLabel}>Prefix uang keluar</Text>
            <TextInput
              style={styles.ruleInput}
              value={expenseDraft}
              onChangeText={setExpenseDraft}
              placeholder="pembayaran, bayar, transfer ke"
              placeholderTextColor={colors.faint}
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
              placeholderTextColor={colors.faint}
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
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
    color: colors.muted,
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
    color: colors.muted,
    lineHeight: 17,
  },
  statusIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 12,
  },
  indicatorOn: {
    backgroundColor: colors.tealSoft,
  },
  indicatorOff: {
    backgroundColor: colors.redSoft,
  },
  infoText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  modeLabel: {
    color: colors.teal,
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
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchSection: {
    marginTop: 12,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchInput: {
    minHeight: 44,
    marginBottom: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 13,
  },
  primaryActionButton: {
    minHeight: 48,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: colors.surface,
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
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appRowText: {
    flex: 1,
    marginRight: 12,
  },
  appLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  appPackage: {
    color: colors.muted,
    fontSize: 11,
  },
  addSourceText: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: '800',
  },
  noAppsText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionButton: {
    minHeight: 58,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionSubtitle: {
    color: colors.muted,
    fontSize: 12,
  },
  actionChevron: {
    color: colors.muted,
    fontSize: 20,
    marginLeft: 12,
  },
  dangerText: {
    color: colors.red,
  },
  activeSourceRow: {
    minHeight: 68,
    padding: 12,
    marginBottom: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ruleTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  prefixSummary: {
    marginTop: 4,
    color: colors.teal,
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
    backgroundColor: colors.primarySoft,
  },
  setupButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  disableButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.redSoft,
  },
  disableButtonText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '800',
  },
  inputLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  ruleInput: {
    minHeight: 52,
    marginBottom: 10,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    color: colors.ink,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  ruleHint: {
    color: colors.muted,
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
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  dataLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
  },
  privacyText: {
    color: colors.muted,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSheetTall: {
    maxHeight: '82%',
    padding: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: colors.primary,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  modalList: {
    maxHeight: 420,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: colors.muted,
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
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: colors.ink,
    fontWeight: '800',
  },
  modalSaveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: colors.surface,
    fontWeight: '800',
  },
});
