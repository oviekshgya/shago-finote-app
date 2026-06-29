/**
 * Settings Screen
 * Pengaturan listener, privasi, dan data lokal.
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
import NotificationModule from '../native/NotificationModule';
import {FinancialStorage} from '../storage/FinancialStorage';
import {TransactionCaptureService} from '../services/TransactionCaptureService';
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
  };

  const processNow = async () => {
    const result = await TransactionCaptureService.syncFromNotificationModule(NotificationModule);
    await refresh();
    Alert.alert(
      'Proses notifikasi selesai',
      `Tercatat: ${result.captured}\nGagal/diabaikan: ${result.failed}\nDuplikat: ${result.duplicates}`,
    );
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
        <View style={styles.header}>
          <Text style={styles.title}>Pengaturan</Text>
          <Text style={styles.subtitle}>Listener notifikasi, privasi, dan data lokal.</Text>
        </View>

        <View style={styles.statusCard}>
          <View>
            <Text style={styles.cardLabel}>Notification Listener</Text>
            <Text style={styles.cardTitle}>{listenerEnabled ? 'Aktif' : 'Belum aktif'}</Text>
            <Text style={styles.cardDesc}>
              {listenerEnabled
                ? 'Notifikasi dari source terpilih bisa diproses.'
                : 'Aktifkan agar transaksi dari m-banking/e-wallet bisa dibaca.'}
            </Text>
          </View>
          <View style={[styles.statusPill, listenerEnabled ? styles.statusPillOn : styles.statusPillOff]}>
            <Text style={styles.statusPillText}>{listenerEnabled ? 'ON' : 'OFF'}</Text>
          </View>
        </View>

        <ActionButton title="Buka Notification Access" subtitle="Aktifkan atau matikan akses listener" onPress={openNotificationAccess} />
        <ActionButton title="Refresh Status" subtitle="Cek ulang status listener dan jumlah data" onPress={refresh} />

        <Text style={styles.sectionTitle}>Source Notifikasi</Text>
        <View style={styles.sourceCard}>
          <Text style={styles.sourceInfo}>
            Pilih app yang boleh ditangkap. Setelah dipilih, isi prefix kata untuk membedakan uang masuk dan keluar dari title/isi notifikasi.
          </Text>
          <Text style={styles.captureMode}>
            Mode capture: {captureFilter.captureAll ? 'Semua app' : `${captureFilter.packages.length} app dipilih`}
          </Text>
        </View>

        {enabledRules.map(rule => (
          <RuleEditor
            key={rule.packageName}
            rule={rule}
            onDisable={() => disableApp(rule.packageName)}
            onChangeIncome={value =>
              updateRulePrefixes(rule.packageName, {incomePrefixes: splitPrefixes(value)})
            }
            onChangeExpense={value =>
              updateRulePrefixes(rule.packageName, {expensePrefixes: splitPrefixes(value)})
            }
          />
        ))}

        <TextInput
          style={styles.searchInput}
          value={appSearch}
          onChangeText={setAppSearch}
          placeholder="Cari app, contoh: GoPay, Gojek, DANA, BCA"
          placeholderTextColor="#737373"
        />
        {filteredApps.map(app => (
          <Pressable key={app.packageName} style={styles.appRow} onPress={() => enableApp(app)}>
            <View style={styles.appRowText}>
              <Text style={styles.appLabel}>{app.label}</Text>
              <Text style={styles.appPackage}>{app.packageName}</Text>
            </View>
            <Text style={styles.addSourceText}>Pilih</Text>
          </Pressable>
        ))}

        <ActionButton title="Proses Notifikasi Sekarang" subtitle="Parse raw notification menjadi transaksi memakai rule aktif" onPress={processNow} />

        <Text style={styles.sectionTitle}>Data Lokal</Text>
        <View style={styles.dataGrid}>
          <DataBox label="Raw notif" value={rawCount.toString()} />
          <DataBox label="Transaksi" value={transactionCount.toString()} />
          <DataBox label="Tagihan" value={billCount.toString()} />
        </View>

        <ActionButton title="Hapus Raw Notification" subtitle="Membersihkan log mentah listener" danger onPress={clearRawLogs} />
        <ActionButton title="Hapus Semua Data Lokal" subtitle="Reset data finance di perangkat ini" danger onPress={clearAllLocalData} />

        <View style={styles.privacyCard}>
          <Text style={styles.sectionTitle}>Privasi</Text>
          <Text style={styles.privacyText}>
            Data transaksi dan raw notification disimpan lokal di perangkat. Aplikasi tidak mengirim data ke backend secara default.
          </Text>
        </View>
      </ScrollView>
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

function RuleEditor({
  rule,
  onDisable,
  onChangeIncome,
  onChangeExpense,
}: {
  rule: CaptureRule;
  onDisable(): void;
  onChangeIncome(value: string): void;
  onChangeExpense(value: string): void;
}) {
  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <View style={styles.actionTextWrap}>
          <Text style={styles.ruleTitle}>{rule.appLabel}</Text>
          <Text style={styles.appPackage}>{rule.packageName}</Text>
        </View>
        <Pressable style={styles.disableButton} onPress={onDisable}>
          <Text style={styles.disableButtonText}>Off</Text>
        </Pressable>
      </View>

      <Text style={styles.inputLabel}>Prefix uang masuk</Text>
      <TextInput
        style={styles.ruleInput}
        defaultValue={rule.incomePrefixes.join(', ')}
        onEndEditing={event => onChangeIncome(event.nativeEvent.text)}
        placeholder="Contoh: menerima, diterima, top up berhasil, uang masuk"
        placeholderTextColor="#737373"
      />

      <Text style={styles.inputLabel}>Prefix uang keluar</Text>
      <TextInput
        style={styles.ruleInput}
        defaultValue={rule.expensePrefixes.join(', ')}
        onEndEditing={event => onChangeExpense(event.nativeEvent.text)}
        placeholder="Contoh: pembayaran, bayar, transaksi berhasil, transfer ke"
        placeholderTextColor="#737373"
      />
      <Text style={styles.ruleHint}>Pisahkan beberapa prefix dengan koma. Nominal Rp/IDR akan dibaca otomatis.</Text>
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
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  cardLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardDesc: {
    maxWidth: 240,
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 17,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillOn: {
    backgroundColor: '#14532d',
  },
  statusPillOff: {
    backgroundColor: '#4b1d1d',
  },
  statusPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  actionButton: {
    minHeight: 62,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
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
    marginBottom: 3,
  },
  actionSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  actionChevron: {
    color: '#9ca3af',
    fontSize: 24,
    marginLeft: 12,
  },
  sourceCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  sourceInfo: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 18,
  },
  captureMode: {
    marginTop: 8,
    color: '#86efac',
    fontSize: 12,
    fontWeight: '800',
  },
  searchInput: {
    minHeight: 46,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  appRow: {
    minHeight: 58,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
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
    marginBottom: 3,
  },
  appPackage: {
    color: '#9ca3af',
    fontSize: 11,
  },
  addSourceText: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '800',
  },
  ruleCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#334155',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ruleTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  disableButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#4b1d1d',
  },
  disableButtonText: {
    color: '#fecaca',
    fontSize: 11,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  ruleInput: {
    minHeight: 44,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#303036',
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 12,
  },
  ruleHint: {
    color: '#9ca3af',
    fontSize: 11,
    lineHeight: 16,
  },
  dangerText: {
    color: '#f87171',
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 12,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  dataGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dataBox: {
    flex: 1,
    minHeight: 70,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  dataLabel: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 11,
  },
  privacyCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  privacyText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 19,
  },
});
