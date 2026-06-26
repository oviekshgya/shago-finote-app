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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import NotificationModule from '../native/NotificationModule';
import type {
  CaptureFilter,
  InstalledApp,
  NotificationLog,
  WebhookAuthType,
  WebhookConfig,
  WebhookFields,
  WebhookMethod,
} from '../types/NotificationLog';
import {formatDate} from '../utils/formatDate';

const disclosureText =
  'Notification Access aktif manual. Webhook hanya dikirim untuk group yang kamu setting.';

const defaultFields: WebhookFields = {
  id: true,
  packageName: true,
  notificationId: true,
  tag: true,
  title: true,
  text: true,
  subText: true,
  bigText: true,
  postTime: true,
  receivedAt: true,
};

function defaultConfig(packageName: string): WebhookConfig {
  return {
    packageName,
    enabled: false,
    url: '',
    method: 'POST',
    authType: 'none',
    bearerToken: '',
    basicUsername: '',
    basicPassword: '',
    customHeaders: '',
    fields: defaultFields,
  };
}

const defaultFilter: CaptureFilter = {captureAll: true, packages: []};

export default function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [configs, setConfigs] = useState<Record<string, WebhookConfig>>({});
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [captureFilter, setCaptureFilter] = useState<CaptureFilter>(defaultFilter);
  const [listenerEnabled, setListenerEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'history' | 'groups' | 'apps'>('history');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookConfig | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [enabled, rawLogs, rawConfigs, rawApps, rawFilter] =
        await Promise.all([
          NotificationModule.isListenerEnabled(),
          NotificationModule.getLogs(),
          NotificationModule.getWebhookConfigs(),
          NotificationModule.getInstalledApps(),
          NotificationModule.getCaptureFilter(),
        ]);
      const parsedLogs = JSON.parse(rawLogs || '[]') as NotificationLog[];
      const parsedConfigs = JSON.parse(rawConfigs || '{}') as Record<
        string,
        WebhookConfig
      >;
      const parsedApps = JSON.parse(rawApps || '[]') as InstalledApp[];
      const parsedFilter = JSON.parse(rawFilter || '{}') as CaptureFilter;
      setListenerEnabled(enabled);
      setLogs(Array.isArray(parsedLogs) ? parsedLogs : []);
      setConfigs(parsedConfigs && typeof parsedConfigs === 'object' ? parsedConfigs : {});
      setInstalledApps(Array.isArray(parsedApps) ? parsedApps : []);
      setCaptureFilter({
        captureAll: parsedFilter.captureAll ?? true,
        packages: Array.isArray(parsedFilter.packages) ? parsedFilter.packages : [],
      });
    } catch (error) {
      Alert.alert('Gagal memuat data', String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groups = useMemo(() => {
    const grouped = new Map<string, {packageName: string; count: number; latest: number}>();
    logs.forEach(log => {
      const current = grouped.get(log.packageName);
      grouped.set(log.packageName, {
        packageName: log.packageName,
        count: (current?.count ?? 0) + 1,
        latest: Math.max(current?.latest ?? 0, log.receivedAt),
      });
    });
    return [...grouped.values()].sort((a, b) => b.latest - a.latest);
  }, [logs]);

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return installedApps;
    }
    return installedApps.filter(app =>
      `${app.label} ${app.packageName}`.toLowerCase().includes(query),
    );
  }, [installedApps, search]);

  const selectedPackages = useMemo(
    () => new Set(captureFilter.packages),
    [captureFilter.packages],
  );

  async function saveFilter(next: CaptureFilter) {
    setCaptureFilter(next);
    try {
      await NotificationModule.saveCaptureFilter(JSON.stringify(next));
    } catch (error) {
      Alert.alert('Gagal menyimpan filter', String(error));
      loadData();
    }
  }

  function togglePackage(packageName: string) {
    const current = new Set(captureFilter.packages);
    if (current.has(packageName)) {
      current.delete(packageName);
    } else {
      current.add(packageName);
    }
    saveFilter({captureAll: false, packages: [...current]});
  }

  async function openSettings() {
    Alert.alert('Aktifkan Notification Access', disclosureText, [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Buka Settings',
        onPress: () => {
          NotificationModule.openSettings().catch(error => {
            Alert.alert('Gagal membuka Settings', String(error));
          });
        },
      },
    ]);
  }

  async function clearLogs() {
    Alert.alert('Hapus riwayat?', 'Semua log lokal akan dihapus dari perangkat.', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await NotificationModule.clearLogs();
            setLogs([]);
          } catch (error) {
            Alert.alert('Gagal menghapus log', String(error));
          }
        },
      },
    ]);
  }

  function editWebhook(packageName: string) {
    const existing = configs[packageName];
    setEditingPackage(packageName);
    setForm({
      ...defaultConfig(packageName),
      ...existing,
      fields: {...defaultFields, ...(existing?.fields ?? {})},
    });
  }

  async function saveWebhook() {
    if (!form) {
      return;
    }
    if (form.enabled && !form.url.trim()) {
      Alert.alert('URL wajib diisi', 'Isi URL webhook atau matikan webhook.');
      return;
    }
    if (form.authType === 'custom' && form.customHeaders.trim()) {
      try {
        JSON.parse(form.customHeaders);
      } catch {
        Alert.alert('Custom headers tidak valid', 'Gunakan format JSON object.');
        return;
      }
    }

    try {
      await NotificationModule.saveWebhookConfig(JSON.stringify(form));
      setConfigs(current => ({...current, [form.packageName]: form}));
      setEditingPackage(null);
      setForm(null);
    } catch (error) {
      Alert.alert('Gagal menyimpan webhook', String(error));
    }
  }

  async function clearWebhook() {
    if (!editingPackage) {
      return;
    }
    try {
      await NotificationModule.clearWebhookConfig(editingPackage);
      setConfigs(current => {
        const next = {...current};
        delete next[editingPackage];
        return next;
      });
      setEditingPackage(null);
      setForm(null);
    } catch (error) {
      Alert.alert('Gagal menghapus webhook', String(error));
    }
  }

  function setFormValue<K extends keyof WebhookConfig>(key: K, value: WebhookConfig[K]) {
    setForm(current => (current ? {...current, [key]: value} : current));
  }

  function toggleField(key: keyof WebhookFields) {
    setForm(current =>
      current
        ? {...current, fields: {...current.fields, [key]: !current.fields[key]}}
        : current,
    );
  }

  return (
    <View style={[styles.safeArea, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      <StatusBar barStyle="light-content" backgroundColor="#111113" />
      <View style={styles.screen}>
        <View style={[styles.topPanel, {paddingTop: Math.max(insets.top, 24) + 14}]}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>S</Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.title}>Shago Notif Listener</Text>
              <Text style={styles.subtitle}>{disclosureText}</Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <Metric label="Listener" value={listenerEnabled ? 'Aktif' : 'Off'} tone={listenerEnabled ? 'good' : 'bad'} />
            <Metric label="History" value={`${logs.length}`} />
            <Metric label="Filter" value={captureFilter.captureAll ? 'Semua' : `${captureFilter.packages.length}`} tone={captureFilter.captureAll ? 'warn' : 'good'} />
          </View>
        </View>

        <View style={styles.commandBar}>
          <Pressable style={styles.primaryButton} onPress={openSettings}>
            <Text style={styles.primaryButtonText}>Aktifkan Listener</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={loadData}>
            <Text style={styles.iconButtonText}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.iconButtonDanger} onPress={clearLogs}>
            <Text style={styles.iconButtonDangerText}>Clear</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <TabButton active={tab === 'history'} label="History" onPress={() => setTab('history')} />
          <TabButton active={tab === 'groups'} label="Groups" onPress={() => setTab('groups')} />
          <TabButton active={tab === 'apps'} label="Apps" onPress={() => setTab('apps')} />
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#c9152a" />
          </View>
        ) : tab === 'history' ? (
          <HistoryList logs={logs} onSelect={setSelectedLog} />
        ) : tab === 'groups' ? (
          <GroupsList groups={groups} configs={configs} onEdit={editWebhook} />
        ) : (
          <AppsFilter
            apps={filteredApps}
            captureFilter={captureFilter}
            selectedPackages={selectedPackages}
            search={search}
            onSearch={setSearch}
            onToggleAll={value => saveFilter({captureAll: value, packages: captureFilter.packages})}
            onTogglePackage={togglePackage}
          />
        )}
      </View>

      <LogModal log={selectedLog} onClose={() => setSelectedLog(null)} />

      <WebhookModal
        editingPackage={editingPackage}
        form={form}
        onClose={() => {
          setEditingPackage(null);
          setForm(null);
        }}
        onClear={clearWebhook}
        onSave={saveWebhook}
        onSetFormValue={setFormValue}
        onToggleField={toggleField}
      />
    </View>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'bad' | 'warn';
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === 'good' && styles.goodText,
          tone === 'bad' && styles.badText,
          tone === 'warn' && styles.warnText,
        ]}>
        {value}
      </Text>
    </View>
  );
}

function HistoryList({
  logs,
  onSelect,
}: {
  logs: NotificationLog[];
  onSelect(log: NotificationLog): void;
}) {
  return (
    <FlatList
      data={logs}
      keyExtractor={item => item.id}
      contentContainerStyle={logs.length === 0 ? styles.emptyList : styles.list}
      ListEmptyComponent={<EmptyState text="Belum ada notifikasi yang lolos filter." />}
      renderItem={({item}) => (
        <Pressable style={styles.logItem} onPress={() => onSelect(item)}>
          <View style={styles.logTop}>
            <View style={styles.appAvatar}>
              <Text style={styles.appAvatarText}>{item.packageName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.logMain}>
              <Text style={styles.packageName} numberOfLines={1}>{item.packageName}</Text>
              <Text style={styles.time}>{formatDate(item.receivedAt)}</Text>
            </View>
            <WebhookBadge log={item} />
          </View>
          <Text style={styles.logTitle} numberOfLines={2}>{item.title || '(tanpa judul)'}</Text>
          <Text style={styles.logText} numberOfLines={3}>{item.bigText || item.text || item.subText || '(tanpa teks)'}</Text>
        </Pressable>
      )}
    />
  );
}

function GroupsList({
  groups,
  configs,
  onEdit,
}: {
  groups: Array<{packageName: string; count: number; latest: number}>;
  configs: Record<string, WebhookConfig>;
  onEdit(packageName: string): void;
}) {
  return (
    <FlatList
      data={groups}
      keyExtractor={item => item.packageName}
      contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
      ListEmptyComponent={<EmptyState text="Group muncul setelah notifikasi dari package yang lolos filter." />}
      renderItem={({item}) => {
        const config = configs[item.packageName];
        return (
          <View style={styles.groupItem}>
            <View style={styles.appAvatar}>
              <Text style={styles.appAvatarText}>{item.packageName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.groupText}>
              <Text style={styles.packageName} numberOfLines={1}>{item.packageName}</Text>
              <Text style={styles.groupMeta}>{item.count} notif, terakhir {formatDate(item.latest)}</Text>
              <Text style={config?.enabled ? styles.webhookOn : styles.webhookOff}>
                Webhook {config?.enabled ? 'aktif' : 'mati'}
              </Text>
            </View>
            <Pressable style={styles.smallButton} onPress={() => onEdit(item.packageName)}>
              <Text style={styles.smallButtonText}>Setting</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

function AppsFilter({
  apps,
  captureFilter,
  selectedPackages,
  search,
  onSearch,
  onToggleAll,
  onTogglePackage,
}: {
  apps: InstalledApp[];
  captureFilter: CaptureFilter;
  selectedPackages: Set<string>;
  search: string;
  onSearch(value: string): void;
  onToggleAll(value: boolean): void;
  onTogglePackage(packageName: string): void;
}) {
  return (
    <FlatList
      data={apps}
      keyExtractor={item => item.packageName}
      contentContainerStyle={apps.length === 0 ? styles.emptyList : styles.list}
      ListHeaderComponent={
        <View style={styles.filterPanel}>
          <View style={styles.filterHeader}>
            <View style={styles.filterHeaderText}>
              <Text style={styles.sectionTitle}>Filter Sumber Notifikasi</Text>
              <Text style={styles.sectionSubtitle}>
                Matikan capture semua untuk memilih package tertentu saja.
              </Text>
            </View>
            <Switch
              value={captureFilter.captureAll}
              onValueChange={onToggleAll}
              thumbColor={captureFilter.captureAll ? '#ffffff' : '#f4f3f4'}
              trackColor={{false: '#d7c7be', true: '#c9152a'}}
            />
          </View>
          <TextInput
            autoCapitalize="none"
            placeholder="Cari nama app atau package"
            placeholderTextColor="#9b8c86"
            style={styles.searchInput}
            value={search}
            onChangeText={onSearch}
          />
          <Text style={styles.filterSummary}>
            Mode: {captureFilter.captureAll ? 'semua notifikasi ditangkap' : `${captureFilter.packages.length} package dipilih`}
          </Text>
        </View>
      }
      ListEmptyComponent={<EmptyState text="Daftar aplikasi belum tersedia dari Android." />}
      renderItem={({item}) => {
        const selected = selectedPackages.has(item.packageName);
        return (
          <Pressable
            disabled={captureFilter.captureAll}
            style={[styles.appRow, captureFilter.captureAll && styles.disabledRow]}
            onPress={() => onTogglePackage(item.packageName)}>
            <View style={styles.appAvatar}>
              <Text style={styles.appAvatarText}>{item.label.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.appText}>
              <Text style={styles.appLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.appPackage} numberOfLines={1}>{item.packageName}</Text>
            </View>
            <Switch
              disabled={captureFilter.captureAll}
              value={captureFilter.captureAll || selected}
              onValueChange={() => onTogglePackage(item.packageName)}
              thumbColor={captureFilter.captureAll || selected ? '#ffffff' : '#f4f3f4'}
              trackColor={{false: '#d7c7be', true: '#c9152a'}}
            />
          </Pressable>
        );
      }}
    />
  );
}

function TabButton({active, label, onPress}: {active: boolean; label: string; onPress(): void}) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({text}: {text: string}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Belum ada data</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function WebhookBadge({log}: {log: NotificationLog}) {
  const status = log.webhookStatus ?? 'disabled';
  const style =
    status === 'sent'
      ? styles.badgeSent
      : status === 'failed'
        ? styles.badgeFailed
        : status === 'pending'
          ? styles.badgePending
          : styles.badgeDisabled;
  return <Text style={[styles.badge, style]}>{status}</Text>;
}

function LogModal({log, onClose}: {log: NotificationLog | null; onClose(): void}) {
  return (
    <Modal visible={log !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>Detail Notifikasi</Text>
            {log ? (
              <>
                <Detail label="Package" value={log.packageName} />
                <Detail label="Notification ID" value={String(log.notificationId ?? '-')} />
                <Detail label="Tag" value={log.tag || '-'} />
                <Detail label="Title" value={log.title || '-'} />
                <Detail label="Text" value={log.text || '-'} />
                <Detail label="Sub Text" value={log.subText || '-'} />
                <Detail label="Big Text" value={log.bigText || '-'} />
                <Detail label="Notif Masuk" value={formatDate(log.receivedAt)} />
                <Detail label="Post Time" value={formatDate(log.postTime)} />
                <Detail label="Webhook Status" value={log.webhookStatus || 'disabled'} />
                <Detail label="Webhook Terkirim" value={log.webhookSentAt ? formatDate(log.webhookSentAt) : '-'} />
                <Detail label="HTTP Status" value={String(log.webhookHttpStatus ?? '-')} />
                <Detail label="Webhook Error" value={log.webhookError || '-'} />
              </>
            ) : null}
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Tutup</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function WebhookModal({
  editingPackage,
  form,
  onClose,
  onClear,
  onSave,
  onSetFormValue,
  onToggleField,
}: {
  editingPackage: string | null;
  form: WebhookConfig | null;
  onClose(): void;
  onClear(): void;
  onSave(): void;
  onSetFormValue<K extends keyof WebhookConfig>(key: K, value: WebhookConfig[K]): void;
  onToggleField(key: keyof WebhookFields): void;
}) {
  return (
    <Modal visible={form !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Webhook Group</Text>
            <Text style={styles.modalPackage}>{editingPackage}</Text>
            <Text style={styles.warning}>
              Aktifkan hanya untuk endpoint yang kamu percaya. Hindari mengirim OTP atau data sensitif ke URL yang tidak kamu kontrol.
            </Text>

            {form ? (
              <>
                <ToggleRow label="Webhook aktif" value={form.enabled} onValueChange={value => onSetFormValue('enabled', value)} />
                <Field label="URL">
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="url"
                    placeholder="https://example.com/webhook"
                    placeholderTextColor="#9b8c86"
                    style={styles.input}
                    value={form.url}
                    onChangeText={value => onSetFormValue('url', value)}
                  />
                </Field>
                <Field label="Method">
                  <Segment options={['POST', 'GET']} value={form.method} onChange={value => onSetFormValue('method', value as WebhookMethod)} />
                </Field>
                <Field label="Auth">
                  <Segment options={['none', 'bearer', 'basic', 'custom']} value={form.authType} onChange={value => onSetFormValue('authType', value as WebhookAuthType)} />
                </Field>
                {form.authType === 'bearer' ? (
                  <Field label="Bearer Token">
                    <TextInput autoCapitalize="none" secureTextEntry style={styles.input} value={form.bearerToken} onChangeText={value => onSetFormValue('bearerToken', value)} />
                  </Field>
                ) : null}
                {form.authType === 'basic' ? (
                  <>
                    <Field label="Basic Username">
                      <TextInput autoCapitalize="none" style={styles.input} value={form.basicUsername} onChangeText={value => onSetFormValue('basicUsername', value)} />
                    </Field>
                    <Field label="Basic Password">
                      <TextInput secureTextEntry style={styles.input} value={form.basicPassword} onChangeText={value => onSetFormValue('basicPassword', value)} />
                    </Field>
                  </>
                ) : null}
                {form.authType === 'custom' ? (
                  <Field label="Custom Headers JSON">
                    <TextInput
                      autoCapitalize="none"
                      multiline
                      placeholder='{"X-Api-Key":"secret"}'
                      placeholderTextColor="#9b8c86"
                      style={[styles.input, styles.multilineInput]}
                      value={form.customHeaders}
                      onChangeText={value => onSetFormValue('customHeaders', value)}
                    />
                  </Field>
                ) : null}
                <Text style={styles.sectionLabel}>Payload Fields</Text>
                {(Object.keys(defaultFields) as Array<keyof WebhookFields>).map(key => (
                  <ToggleRow key={key} label={key} value={form.fields[key]} onValueChange={() => onToggleField(key)} />
                ))}
              </>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClear}>
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={onSave}>
              <Text style={styles.closeButtonText}>Simpan</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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

function ToggleRow({label, value, onValueChange}: {label: string; value: boolean; onValueChange(value: boolean): void}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{false: '#d7c7be', true: '#c9152a'}} />
    </View>
  );
}

function Segment({options, value, onChange}: {options: string[]; value: string; onChange(value: string): void}) {
  return (
    <View style={styles.segment}>
      {options.map(option => (
        <Pressable key={option} style={[styles.segmentItem, value === option && styles.segmentItemActive]} onPress={() => onChange(option)}>
          <Text style={[styles.segmentText, value === option && styles.segmentTextActive]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Detail({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#111113'},
  screen: {flex: 1, backgroundColor: '#f3f0ec'},
  topPanel: {
    backgroundColor: '#111113',
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  brandMark: {width: 44, height: 44, borderRadius: 8, backgroundColor: '#c9152a', alignItems: 'center', justifyContent: 'center'},
  brandMarkText: {color: '#ffffff', fontWeight: '900', fontSize: 22},
  brandCopy: {flex: 1},
  title: {color: '#ffffff', fontSize: 24, fontWeight: '900'},
  subtitle: {color: '#d8ccc5', fontSize: 13, lineHeight: 18, marginTop: 4},
  metricGrid: {flexDirection: 'row', gap: 10, marginTop: 18},
  metricCard: {flex: 1, backgroundColor: '#222225', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#333338'},
  metricLabel: {color: '#a9a1a0', fontSize: 11, fontWeight: '800', textTransform: 'uppercase'},
  metricValue: {color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 5},
  goodText: {color: '#38c172'},
  badText: {color: '#ff5a68'},
  warnText: {color: '#ffd166'},
  commandBar: {flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 10},
  primaryButton: {flex: 1.45, backgroundColor: '#c9152a', borderRadius: 8, paddingVertical: 14, alignItems: 'center'},
  primaryButtonText: {color: '#ffffff', fontWeight: '900', fontSize: 14},
  iconButton: {flex: 1, backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d7d1'},
  iconButtonText: {color: '#252223', fontWeight: '900'},
  iconButtonDanger: {flex: 0.85, backgroundColor: '#fff1f1', borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f0b9bd'},
  iconButtonDangerText: {color: '#b20f22', fontWeight: '900'},
  tabs: {flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#e3dad4', borderRadius: 8, padding: 4},
  tabButton: {flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 6},
  tabButtonActive: {backgroundColor: '#111113'},
  tabText: {fontWeight: '900', color: '#6d625d', fontSize: 13},
  tabTextActive: {color: '#ffffff'},
  centerState: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {padding: 16, paddingTop: 4, gap: 10},
  emptyList: {flexGrow: 1, justifyContent: 'center', padding: 24},
  emptyState: {alignItems: 'center'},
  emptyTitle: {color: '#211f20', fontSize: 18, fontWeight: '900'},
  emptyText: {color: '#6d625d', marginTop: 8, textAlign: 'center', lineHeight: 20},
  logItem: {backgroundColor: '#ffffff', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#e3dad4'},
  logTop: {flexDirection: 'row', alignItems: 'center', gap: 10},
  appAvatar: {width: 38, height: 38, borderRadius: 8, backgroundColor: '#201c1d', alignItems: 'center', justifyContent: 'center'},
  appAvatarText: {color: '#ffffff', fontWeight: '900'},
  logMain: {flex: 1},
  packageName: {color: '#211f20', fontWeight: '900'},
  time: {color: '#8a7c76', fontSize: 12, marginTop: 2},
  logTitle: {color: '#211f20', fontSize: 16, fontWeight: '900', marginTop: 10},
  logText: {color: '#5a504c', marginTop: 4, lineHeight: 19},
  badge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '900', overflow: 'hidden'},
  badgeSent: {backgroundColor: '#e7f7ee', color: '#187a42'},
  badgeFailed: {backgroundColor: '#fff0f0', color: '#b20f22'},
  badgePending: {backgroundColor: '#fff5dc', color: '#8a6500'},
  badgeDisabled: {backgroundColor: '#eee9e5', color: '#6d625d'},
  groupItem: {backgroundColor: '#ffffff', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#e3dad4', flexDirection: 'row', alignItems: 'center', gap: 12},
  groupText: {flex: 1, gap: 3},
  groupMeta: {color: '#6d625d', fontSize: 13},
  webhookOn: {color: '#187a42', fontWeight: '900', fontSize: 13},
  webhookOff: {color: '#8a7c76', fontWeight: '900', fontSize: 13},
  smallButton: {backgroundColor: '#111113', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10},
  smallButtonText: {color: '#ffffff', fontWeight: '900'},
  filterPanel: {backgroundColor: '#ffffff', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#e3dad4', marginBottom: 10},
  filterHeader: {flexDirection: 'row', alignItems: 'center', gap: 12},
  filterHeaderText: {flex: 1},
  sectionTitle: {fontSize: 17, color: '#211f20', fontWeight: '900'},
  sectionSubtitle: {color: '#6d625d', marginTop: 4, lineHeight: 19},
  searchInput: {backgroundColor: '#f5f2ef', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginTop: 12, color: '#211f20', borderWidth: 1, borderColor: '#e3dad4'},
  filterSummary: {color: '#8a141e', fontWeight: '800', marginTop: 10},
  appRow: {backgroundColor: '#ffffff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e3dad4', flexDirection: 'row', alignItems: 'center', gap: 12},
  disabledRow: {opacity: 0.68},
  appText: {flex: 1},
  appLabel: {color: '#211f20', fontWeight: '900'},
  appPackage: {color: '#786c66', marginTop: 3, fontSize: 12},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end'},
  modalContent: {backgroundColor: '#ffffff', borderTopLeftRadius: 8, borderTopRightRadius: 8, maxHeight: '88%', padding: 20},
  modalTitle: {color: '#211f20', fontSize: 22, fontWeight: '900', marginBottom: 6},
  modalPackage: {color: '#c9152a', fontWeight: '900', marginBottom: 10},
  warning: {backgroundColor: '#fff5dc', color: '#5c4300', padding: 10, borderRadius: 8, lineHeight: 19, marginBottom: 12},
  field: {marginBottom: 12},
  fieldLabel: {color: '#6d625d', fontSize: 12, fontWeight: '900', marginBottom: 6, textTransform: 'uppercase'},
  input: {borderWidth: 1, borderColor: '#d7c7be', borderRadius: 8, padding: 12, color: '#211f20', backgroundColor: '#ffffff'},
  multilineInput: {minHeight: 88, textAlignVertical: 'top'},
  sectionLabel: {fontSize: 16, fontWeight: '900', color: '#211f20', marginTop: 8, marginBottom: 6},
  toggleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#eee6e1'},
  toggleLabel: {color: '#211f20', fontWeight: '800'},
  segment: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  segmentItem: {borderWidth: 1, borderColor: '#d7c7be', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9},
  segmentItemActive: {backgroundColor: '#111113', borderColor: '#111113'},
  segmentText: {color: '#3e3632', fontWeight: '900'},
  segmentTextActive: {color: '#ffffff'},
  modalActions: {flexDirection: 'row', gap: 10, marginTop: 16},
  secondaryButton: {flex: 1, backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#d7c7be'},
  secondaryButtonText: {color: '#252223', fontWeight: '900'},
  closeButton: {flex: 1, backgroundColor: '#c9152a', borderRadius: 8, paddingVertical: 14, alignItems: 'center'},
  closeButtonText: {color: '#ffffff', fontWeight: '900'},
  detailRow: {paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee6e1'},
  detailLabel: {color: '#806f68', fontSize: 12, fontWeight: '900', textTransform: 'uppercase'},
  detailValue: {color: '#211f20', marginTop: 4, lineHeight: 20},
});
