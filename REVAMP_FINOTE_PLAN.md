# Plan Revamp Shago Finote App

## 0. Instruksi untuk Model AI yang Akan Mengerjakan

Dokumen ini adalah handoff implementasi. Model AI lain yang mengerjakan repo ini harus membaca seluruh dokumen sebelum mengubah kode.

Prioritas utama:

1. Pertahankan modul Android Notification Listener yang sudah ada.
2. Ubah produk menjadi aplikasi pencatatan keuangan otomatis dari notifikasi m-banking/e-wallet.
3. Kerjakan tanpa backend pada fase awal.
4. Siapkan struktur kode agar backend mudah ditambahkan nanti.
5. Jangan menambah permission sensitif yang tidak diperlukan.
6. Jangan menghapus fitur lama sebelum ada pengganti yang jelas.
7. Pisahkan logic domain finance dari UI.
8. Buat perubahan bertahap dan bisa dites.

Aturan pengerjaan:

- Baca struktur repo terlebih dahulu.
- Identifikasi file lama yang sudah berfungsi sebelum refactor.
- Jangan rewrite native listener dari nol kecuali benar-benar perlu.
- Jangan membuat parser di dalam komponen React.
- Jangan membuat semua logic di satu file besar.
- Jangan jadikan webhook sebagai fitur utama aplikasi finance.
- Jangan memakai backend dummy sebagai dependency wajib.
- Jangan mengubah package id release tanpa keputusan eksplisit.
- Jangan memakai SMS permission, Contacts permission, Call Log permission, atau AccessibilityService.
- Jangan mengirim raw notification ke server secara default.

Output akhir yang diharapkan dari implementasi:

- Aplikasi Android tetap bisa build.
- Notification Access tetap bisa dibuka dari aplikasi.
- User bisa memilih source app bank/e-wallet.
- Notifikasi transaksi bisa menjadi transaksi finance lokal.
- Dashboard, transaksi, dan tagihan tersedia.
- Data tersimpan lokal.
- Struktur repository/API siap untuk integrasi backend.
- README/BUILD_APK diperbarui sesuai produk baru.

Jika harus mengambil keputusan teknis yang belum tertulis:

- Pilih opsi paling sederhana yang cocok dengan React Native CLI saat ini.
- Prioritaskan local-first.
- Prioritaskan testability parser dan repository.
- Tulis asumsi di catatan implementasi atau README.

## 1. Tujuan Revamp

Revamp repo ini menjadi APK pencatatan keuangan otomatis berbasis React Native Android. Aplikasi membaca notifikasi transaksi dari m-banking dan e-wallet di satu HP, lalu mengubah notifikasi tersebut menjadi catatan pemasukan atau pengeluaran tanpa input manual dari user.

Modul notification listener yang sudah ada tetap dipertahankan sebagai fondasi utama. Fokus perubahan adalah mengubah aplikasi dari "notification archive + webhook" menjadi "personal finance tracker" yang berjalan lokal terlebih dahulu, tanpa backend pada tahap ini, tetapi tetap disiapkan agar mudah diintegrasikan dengan backend pada tahap berikutnya.

## 2. Kondisi Project Saat Ini

Stack saat ini:

- React Native CLI `0.76.6`
- TypeScript
- Kotlin native Android module
- Android `NotificationListenerService`
- Local storage native memakai `SharedPreferences`
- UI utama masih satu screen: `src/screens/HomeScreen.tsx`

File penting yang sudah ada dan harus dipertahankan:

- `android/app/src/main/java/com/shago/notiflistener/NotifListenerService.kt`
- `android/app/src/main/java/com/shago/notiflistener/NotificationModule.kt`
- `android/app/src/main/java/com/shago/notiflistener/NotificationPackage.kt`
- `android/app/src/main/java/com/shago/notiflistener/NotificationStore.kt`
- `android/app/src/main/java/com/shago/notiflistener/CaptureFilterStore.kt`
- `src/native/NotificationModule.ts`
- `src/types/NotificationLog.ts`
- `src/screens/HomeScreen.tsx`

Fitur yang sudah ada:

- Membuka Android Notification Access settings.
- Mengecek status listener aktif atau belum.
- Menangkap notifikasi dari aplikasi lain.
- Menyimpan log notifikasi lokal.
- Filter package aplikasi yang boleh ditangkap.
- Menampilkan log notifikasi.
- Webhook per package.

Fitur yang perlu dipertahankan:

- Notification Access harus tetap eksplisit diaktifkan user.
- Filter sumber notifikasi tetap ada, tetapi diarahkan untuk memilih aplikasi bank/e-wallet.
- Raw notification log tetap tersedia untuk debugging.
- Tidak memakai SMS permission, contacts, call log, atau accessibility service.

Fitur yang perlu dipindahkan prioritasnya:

- Webhook jangan jadi fitur utama UI finance.
- Webhook bisa dipertahankan sebagai developer/debug feature atau disiapkan ulang menjadi sync adapter saat backend sudah ada.

## 3. Target Produk

Nama konsep aplikasi:

- Shago Finote
- Finote
- Finance Notification Tracker

Core value:

- User tidak perlu input transaksi harian secara manual.
- Transaksi masuk/keluar dari m-banking dan e-wallet tercatat otomatis dari notifikasi.
- User tetap bisa koreksi, kategorikan, atau tambah catatan manual.
- Data disimpan lokal dulu, lalu siap disinkronkan ke backend di fase berikutnya.

Target user:

- Pengguna yang punya beberapa rekening bank/e-wallet di satu HP.
- Pengguna yang ingin laporan cashflow personal.
- Pengguna yang sering lupa mencatat transaksi kecil.

## 4. Scope MVP Revamp

MVP yang harus dibangun:

- Dashboard ringkasan keuangan.
- Daftar transaksi otomatis dari notifikasi.
- Parser notifikasi transaksi bank/e-wallet.
- Klasifikasi transaksi: pemasukan, pengeluaran, transfer internal, refund, unknown.
- Filter sumber aplikasi bank/e-wallet.
- Kategori transaksi.
- Detail transaksi.
- Edit hasil parsing transaksi.
- Input manual transaksi.
- Catatan pembayaran keluar dan jatuh tempo.
- Reminder lokal untuk pembayaran jatuh tempo.
- Raw notification viewer untuk debug.
- Local-only data storage.
- Struktur service/repository yang siap diganti ke backend API.

Di luar MVP:

- Login/register.
- Multi-device sync.
- Export PDF.
- Split bill.
- OCR struk.
- Integrasi Open Banking.
- Rekonsiliasi otomatis antar rekening.

## 5. Prinsip Keamanan dan Privasi

Karena aplikasi membaca konten notifikasi, aturan ini wajib dipertahankan:

- User harus diberi penjelasan jelas sebelum membuka Notification Access settings.
- Data notifikasi dan transaksi disimpan lokal pada MVP.
- Tidak ada data dikirim keluar tanpa aksi eksplisit user.
- Jangan membaca SMS atau memakai accessibility service.
- Jangan menyimpan OTP sebagai transaksi.
- Parser wajib mengabaikan notifikasi yang mengandung pola OTP, kode verifikasi, login, reset password, atau security alert.
- Raw notification hanya untuk kebutuhan debug user, bukan halaman utama.
- Saat backend ditambahkan nanti, sync harus opt-in dan memakai token autentikasi.

## 6. Perubahan Struktur Folder

Struktur saat ini masih terlalu datar. Tambahkan struktur domain finance seperti berikut:

```text
src/
  app/
    AppProviders.tsx
    navigation/
      RootNavigator.tsx
      tabs.ts
  components/
    Button.tsx
    Card.tsx
    EmptyState.tsx
    IconButton.tsx
    Input.tsx
    MetricCard.tsx
    SectionHeader.tsx
    StatusPill.tsx
    TransactionAmount.tsx
  constants/
    bankPackages.ts
    categories.ts
    colors.ts
    dateRanges.ts
  features/
    dashboard/
      DashboardScreen.tsx
      components/
        BalanceSummary.tsx
        CashflowChart.tsx
        RecentTransactions.tsx
    transactions/
      TransactionsScreen.tsx
      TransactionDetailScreen.tsx
      TransactionFormScreen.tsx
      components/
        TransactionItem.tsx
        TransactionFilters.tsx
      services/
        transactionRepository.ts
        transactionNormalizer.ts
      types.ts
    notificationCapture/
      NotificationAccessScreen.tsx
      SourceAppsScreen.tsx
      RawNotificationsScreen.tsx
      services/
        notificationRepository.ts
        notificationParser.ts
        parserRules.ts
      types.ts
    bills/
      BillsScreen.tsx
      BillFormScreen.tsx
      components/
        BillItem.tsx
      services/
        billRepository.ts
      types.ts
    settings/
      SettingsScreen.tsx
      PrivacyScreen.tsx
  native/
    NotificationModule.ts
  storage/
    localStore.ts
    syncQueue.ts
  types/
    NotificationLog.ts
    Api.ts
  utils/
    currency.ts
    date.ts
    id.ts
    text.ts
```

Catatan:

- `HomeScreen.tsx` sebaiknya dipecah menjadi beberapa screen.
- `NotificationModule.ts` tetap menjadi boundary native bridge.
- Semua logic parsing jangan diletakkan langsung di komponen UI.
- Repository dibuat sejak awal agar nanti backend mudah ditambahkan.

## 7. Data Model Lokal

### 7.1 NotificationLog

Tipe ini sudah ada dan tetap dipertahankan sebagai raw source.

Tambahkan field opsional:

```ts
export type NotificationLog = {
  id: string;
  packageName: string;
  appLabel?: string;
  notificationId?: number;
  tag?: string | null;
  title?: string;
  text?: string;
  subText?: string;
  bigText?: string;
  postTime: number;
  receivedAt: number;
  parseStatus?: 'ignored' | 'parsed' | 'failed' | 'duplicate';
  parsedTransactionId?: string;
  ignoredReason?: string;
};
```

### 7.2 FinancialTransaction

Tambahkan tipe utama:

```ts
export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund' | 'unknown';

export type TransactionSource = 'notification' | 'manual' | 'import' | 'sync';

export type FinancialTransaction = {
  id: string;
  source: TransactionSource;
  sourceNotificationId?: string;
  sourcePackageName?: string;
  sourceAppLabel?: string;
  accountProvider?: string;
  accountName?: string;
  type: TransactionType;
  amount: number;
  currency: 'IDR';
  title: string;
  description?: string;
  merchantOrCounterparty?: string;
  categoryId?: string;
  transactionTime: number;
  createdAt: number;
  updatedAt: number;
  confidence: number;
  isReviewed: boolean;
  isDuplicate?: boolean;
  rawText?: string;
  syncStatus?: 'local' | 'pending' | 'synced' | 'failed';
  remoteId?: string;
};
```

### 7.3 Category

```ts
export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  isDefault: boolean;
};
```

Default kategori:

- Makanan & Minuman
- Transportasi
- Belanja
- Tagihan
- Transfer
- Gaji
- Top Up
- Kesehatan
- Hiburan
- Pendidikan
- Lainnya

### 7.4 BillReminder

```ts
export type BillReminder = {
  id: string;
  title: string;
  amount: number;
  currency: 'IDR';
  categoryId?: string;
  dueDate: number;
  repeat: 'none' | 'weekly' | 'monthly' | 'yearly';
  status: 'upcoming' | 'paid' | 'overdue' | 'cancelled';
  note?: string;
  createdAt: number;
  updatedAt: number;
  paidTransactionId?: string;
  syncStatus?: 'local' | 'pending' | 'synced' | 'failed';
  remoteId?: string;
};
```

### 7.5 Sync Metadata

Walaupun belum memakai backend, setiap record penting perlu punya:

- `id` lokal UUID.
- `remoteId` opsional.
- `createdAt`.
- `updatedAt`.
- `syncStatus`.
- `deletedAt` opsional untuk soft delete saat sync sudah ada.

## 8. Storage Plan

Untuk MVP cepat:

- Bisa tetap memakai `SharedPreferences` lewat native store untuk raw notification.
- Untuk transaksi, bill, kategori, dan setting, gunakan storage JS yang lebih terstruktur.

Rekomendasi dependency:

- `@react-native-async-storage/async-storage` untuk MVP sederhana.
- `react-native-mmkv` jika ingin performa lebih baik.
- `react-native-sqlite-storage` atau WatermelonDB jika data transaksi nanti besar.

Pilihan pragmatis untuk revamp awal:

- Pakai `AsyncStorage` untuk:
  - transactions
  - bill reminders
  - categories
  - settings
  - sync queue
- Raw notification tetap dari native store dulu.
- Buat repository abstraction supaya storage bisa diganti tanpa mengubah UI.

Contoh repository:

```ts
export type TransactionRepository = {
  list(params?: TransactionListParams): Promise<FinancialTransaction[]>;
  getById(id: string): Promise<FinancialTransaction | null>;
  create(input: TransactionInput): Promise<FinancialTransaction>;
  update(id: string, patch: Partial<FinancialTransaction>): Promise<FinancialTransaction>;
  remove(id: string): Promise<void>;
  findDuplicate(candidate: FinancialTransaction): Promise<FinancialTransaction | null>;
};
```

## 9. Parser Notifikasi Transaksi

Parser adalah inti produk. Parser harus dipisahkan dari native service agar mudah dites.

Input parser:

```ts
export type ParseInput = {
  packageName: string;
  appLabel?: string;
  title?: string;
  text?: string;
  subText?: string;
  bigText?: string;
  postTime: number;
  receivedAt: number;
};
```

Output parser:

```ts
export type ParseResult =
  | {
      status: 'parsed';
      transaction: FinancialTransaction;
      matchedRuleId: string;
    }
  | {
      status: 'ignored';
      reason: string;
    }
  | {
      status: 'failed';
      reason: string;
      rawText: string;
    };
```

Rules parser awal:

- Gabungkan `title`, `text`, `subText`, dan `bigText` menjadi satu raw text.
- Normalisasi huruf, spasi, simbol mata uang, dan format angka Indonesia.
- Deteksi nominal:
  - `Rp10.000`
  - `Rp 10.000`
  - `IDR 10,000`
  - `10.000,00`
- Deteksi arah transaksi:
  - Income: `masuk`, `diterima`, `kredit`, `credit`, `terima`, `refund`, `cashback`
  - Expense: `keluar`, `debit`, `debet`, `pembayaran`, `purchase`, `berhasil bayar`, `transfer ke`, `top up`
  - Transfer: `transfer`, `pemindahan`, `antar rekening`
- Deteksi notifikasi yang harus diabaikan:
  - OTP
  - kode verifikasi
  - login
  - password
  - promo
  - reminder marketing
  - saldo saja tanpa transaksi
  - notifikasi gagal transaksi
- Deteksi merchant/counterparty dari frasa setelah `ke`, `dari`, `di`, `untuk`, atau nama merchant populer.
- Tentukan confidence:
  - 0.9 jika nominal dan arah transaksi jelas.
  - 0.7 jika nominal jelas tetapi merchant tidak jelas.
  - 0.5 jika nominal ada tetapi arah transaksi ambigu.
  - Di bawah 0.6 harus ditandai `isReviewed = false`.

Parser harus memiliki test cases untuk contoh notifikasi bank/e-wallet yang berbeda.

## 10. Source App dan Package Bank/E-Wallet

Gunakan fitur `getInstalledApps()` dan `CaptureFilterStore` yang sudah ada.

Tambahkan daftar package populer sebagai hint, bukan hard dependency:

```ts
export const knownFinancePackages = [
  {provider: 'BCA Mobile', packageName: 'com.bca'},
  {provider: 'myBCA', packageName: 'com.bca.mybca.omni.android'},
  {provider: 'BRImo', packageName: 'id.co.bri.brimo'},
  {provider: 'Livin Mandiri', packageName: 'id.bmri.livin'},
  {provider: 'BNI Mobile Banking', packageName: 'src.com.bni'},
  {provider: 'BSI Mobile', packageName: 'com.bsm.activity2'},
  {provider: 'Jenius', packageName: 'com.btpn.dc'},
  {provider: 'blu', packageName: 'com.bcadigital.blu'},
  {provider: 'GoPay / Gojek', packageName: 'com.gojek.app'},
  {provider: 'OVO', packageName: 'ovo.id'},
  {provider: 'DANA', packageName: 'id.dana'},
  {provider: 'ShopeePay / Shopee', packageName: 'com.shopee.id'},
  {provider: 'LinkAja', packageName: 'com.telkom.mwallet'},
];
```

Catatan:

- Package name bisa berubah, jadi UI tetap harus menampilkan semua installed apps.
- User bisa memilih aplikasi sumber secara manual.
- Default jangan capture semua notifikasi setelah revamp finance. Lebih aman defaultnya memilih finance apps.

## 11. Native Android Changes

### 11.1 Pertahankan

- `NotifListenerService.kt`
- `NotificationModule.kt`
- `NotificationPackage.kt`
- `CaptureFilterStore.kt`
- `NotificationStore.kt`

### 11.2 Tambahkan atau Ubah

`NotifListenerService.kt`:

- Tetap menyimpan raw notification.
- Tambahkan field `appLabel` jika memungkinkan.
- Tambahkan status parsing awal jika parsing dilakukan native.
- Untuk MVP lebih baik native hanya capture raw notification, parsing dilakukan di JS setelah data diambil.

`NotificationStore.kt`:

- Tambahkan method update item by id agar bisa menyimpan `parseStatus` dan `parsedTransactionId`.
- Pertimbangkan menaikkan `MAX_LOGS` dari 500 ke 1000, atau buat setting retention.

`NotificationModule.kt`:

- Tambahkan method:
  - `getLogsSince(timestamp: number): Promise<string>`
  - `markLogParsed(logId: string, transactionId: string): Promise<boolean>`
  - `markLogIgnored(logId: string, reason: string): Promise<boolean>`
  - `getFinanceCandidateApps(): Promise<string>` jika ingin native membantu label/icon app.

Android Manifest:

- Pertahankan permission `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`.
- Pertahankan `INTERNET` hanya jika webhook atau backend sync masih disiapkan.
- Jangan tambah permission sensitif lain tanpa alasan jelas.

## 12. React Native App Changes

### 12.1 Navigation

Tambahkan navigation. Dependency yang disarankan:

- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `react-native-screens`
- `react-native-gesture-handler`

Tab utama:

- Dashboard
- Transaksi
- Tagihan
- Sumber
- Settings

### 12.2 Dashboard

Konten:

- Status listener kecil di bagian atas.
- Saldo bersih bulan ini.
- Total pemasukan bulan ini.
- Total pengeluaran bulan ini.
- Cashflow chart 7/30 hari.
- Kategori pengeluaran terbesar.
- Transaksi terbaru.
- Tagihan mendekati jatuh tempo.

State penting:

- Empty state saat belum ada transaksi.
- Warning jika Notification Access belum aktif.
- Warning jika belum memilih source apps.
- Review queue untuk transaksi confidence rendah.

### 12.3 Transaksi

Fitur:

- List transaksi grouped by date.
- Search merchant/catatan/nominal.
- Filter:
  - tanggal
  - tipe
  - kategori
  - sumber aplikasi
  - reviewed/unreviewed
- Detail transaksi.
- Edit kategori, tipe, nominal, tanggal, catatan.
- Delete atau mark ignored.
- Tambah transaksi manual.

### 12.4 Tagihan dan Jatuh Tempo

Fitur:

- Tambah pembayaran keluar yang akan jatuh tempo.
- Set nominal, tanggal jatuh tempo, kategori, repeat, catatan.
- Status:
  - upcoming
  - overdue
  - paid
  - cancelled
- Tandai sudah dibayar.
- Opsional link ke transaksi pembayaran.
- Reminder lokal di Android.

Dependency reminder lokal yang bisa dipakai:

- `@notifee/react-native`, atau
- `react-native-push-notification`

Jika belum ingin tambah dependency, tampilkan overdue/upcoming di dalam aplikasi dulu.

### 12.5 Sumber Notifikasi

Ganti tab `Apps` lama menjadi `Sumber`.

Fitur:

- Tampilkan installed apps.
- Highlight aplikasi yang kemungkinan bank/e-wallet.
- Toggle source aktif.
- Mode aman default: hanya capture package yang dipilih.
- Tombol buka Notification Access settings.
- Status listener aktif/off.
- Raw notification preview per source.

### 12.6 Settings

Fitur:

- Privacy disclosure.
- Retention raw logs.
- Clear raw logs.
- Clear all transactions.
- Export JSON atau CSV lokal.
- Developer/debug mode untuk raw logs dan webhook lama.
- Placeholder sync backend.

## 13. Desain UI Modern

Arah desain:

- Clean, modern, mobile-first.
- Fokus ke angka, daftar transaksi, dan status yang mudah discan.
- Hindari tampilan terlalu ramai seperti log viewer.
- Gunakan kartu metric ringkas, spacing konsisten, dan warna status jelas.

Palet warna rekomendasi:

- Background: `#F7F8FA`
- Surface: `#FFFFFF`
- Text primary: `#111827`
- Text secondary: `#6B7280`
- Border: `#E5E7EB`
- Primary: `#2563EB`
- Income: `#16A34A`
- Expense: `#DC2626`
- Warning: `#F59E0B`
- Info: `#0EA5E9`

Komponen dasar:

- `MetricCard`
- `TransactionItem`
- `StatusPill`
- `AmountText`
- `SectionHeader`
- `BottomSheet` atau modal detail
- `FloatingActionButton` untuk tambah manual

Aturan UX:

- Angka income selalu hijau dengan tanda `+`.
- Angka expense selalu merah dengan tanda `-`.
- Unknown transaction jangan otomatis masuk laporan utama sebelum direview.
- Jangan jadikan raw notification sebagai halaman awal.
- Notification Access warning harus jelas tapi tidak menutupi seluruh dashboard setelah user paham.
- Semua CTA penting harus bisa dipakai satu tangan.

## 14. Integrasi Backend Nanti

MVP ini tanpa backend, tetapi struktur harus siap backend.

Tambahkan interface service dari awal:

```ts
export type FinanceApiClient = {
  syncTransactions(items: FinancialTransaction[]): Promise<SyncResult>;
  syncBills(items: BillReminder[]): Promise<SyncResult>;
  fetchRemoteChanges(since?: number): Promise<RemoteChanges>;
};
```

File yang disiapkan:

- `src/types/Api.ts`
- `src/storage/syncQueue.ts`
- `src/features/transactions/services/transactionRepository.ts`
- `src/features/bills/services/billRepository.ts`

Strategi sync nanti:

- Semua create/update/delete lokal masuk `syncQueue`.
- Saat backend tersedia, queue dikirim setelah user login.
- Gunakan `remoteId` untuk mapping data backend.
- Konflik diselesaikan dengan `updatedAt` atau version number.
- Backend tidak menerima raw notification by default, kecuali user mengaktifkan diagnostic sync.

Endpoint backend yang kemungkinan dibutuhkan nanti:

- `POST /auth/login`
- `POST /auth/register`
- `GET /me`
- `GET /transactions`
- `POST /transactions`
- `PATCH /transactions/:id`
- `DELETE /transactions/:id`
- `GET /bills`
- `POST /bills`
- `PATCH /bills/:id`
- `DELETE /bills/:id`
- `POST /sync`

## 15. Migration dari App Lama ke App Baru

Tahap migrasi:

1. Rename konsep UI dari notification listener menjadi finance tracker.
2. Pecah `HomeScreen.tsx` menjadi beberapa screen.
3. Pertahankan native listener dan filter package.
4. Tambahkan data model transaksi dan kategori.
5. Tambahkan parser notifikasi.
6. Tambahkan dashboard.
7. Tambahkan list transaksi.
8. Tambahkan form transaksi manual.
9. Tambahkan fitur tagihan/jatuh tempo.
10. Tambahkan raw notification debug screen.
11. Rapikan README dan BUILD_APK agar sesuai app finance.

File lama yang kemungkinan diubah besar:

- `App.tsx`
- `src/screens/HomeScreen.tsx`
- `src/native/NotificationModule.ts`
- `src/types/NotificationLog.ts`
- `android/app/src/main/java/com/shago/notiflistener/NotificationModule.kt`
- `android/app/src/main/java/com/shago/notiflistener/NotificationStore.kt`
- `android/app/src/main/java/com/shago/notiflistener/NotifListenerService.kt`

File baru prioritas:

- `src/features/notificationCapture/services/notificationParser.ts`
- `src/features/notificationCapture/services/parserRules.ts`
- `src/features/transactions/types.ts`
- `src/features/transactions/services/transactionRepository.ts`
- `src/features/bills/types.ts`
- `src/features/bills/services/billRepository.ts`
- `src/storage/localStore.ts`
- `src/constants/categories.ts`
- `src/constants/bankPackages.ts`
- `src/utils/currency.ts`

## 16. Parsing Flow yang Disarankan

Flow saat aplikasi dibuka:

1. JS memanggil `NotificationModule.getLogs()`.
2. Ambil log yang belum punya `parseStatus`.
3. Jalankan `notificationParser.parse(log)`.
4. Jika parsed:
   - cek duplikasi transaksi.
   - simpan ke `transactionRepository`.
   - panggil `markLogParsed`.
5. Jika ignored:
   - panggil `markLogIgnored`.
6. Dashboard dan transaksi membaca data dari repository transaksi.

Flow saat notifikasi baru masuk:

1. Native listener menyimpan raw notification.
2. Jika app sedang aktif, refresh logs secara interval ringan atau event bridge.
3. Parser JS mengubah raw log menjadi transaksi.
4. User melihat transaksi muncul di dashboard/list.

Catatan:

- Untuk MVP, polling ringan saat app foreground cukup.
- Untuk UX lebih baik, tambahkan native event emitter nanti agar transaksi muncul realtime.

## 17. Duplikasi Transaksi

Deduplication wajib agar satu transaksi tidak masuk berkali-kali.

Kriteria duplikasi:

- `sourcePackageName` sama.
- nominal sama.
- tipe sama.
- waktu transaksi dalam rentang 2-5 menit.
- raw text mirip.

Jika duplikat:

- Jangan buat transaksi baru.
- Tandai notification log `parseStatus = duplicate`.
- Simpan `parsedTransactionId` ke transaksi yang sudah ada.

## 18. Manual Input

User tetap bisa input manual untuk:

- Transaksi tunai.
- Transaksi tanpa notifikasi.
- Koreksi transaksi yang gagal diparsing.
- Catatan pembayaran keluar.

Form transaksi manual:

- Tipe: pemasukan/pengeluaran/transfer.
- Nominal.
- Tanggal.
- Kategori.
- Judul.
- Catatan.
- Akun/sumber opsional.

Form tagihan:

- Nama tagihan.
- Nominal.
- Tanggal jatuh tempo.
- Repeat.
- Kategori.
- Catatan.

## 19. Testing Plan

Unit tests:

- `notificationParser`
- format currency
- deduplication
- repository create/update/delete
- bill overdue calculation

Parser fixtures:

- BCA transfer masuk.
- BCA debit/pembayaran.
- BRImo transfer masuk.
- Livin Mandiri pembayaran.
- DANA pembayaran.
- OVO top up.
- GoPay pembayaran.
- ShopeePay pembayaran.
- Promo e-wallet yang harus diabaikan.
- OTP yang harus diabaikan.
- Notifikasi gagal transaksi yang harus diabaikan.

Manual QA:

- Notification Access off/on.
- Pilih source app.
- Notifikasi transaksi masuk.
- Transaksi muncul otomatis.
- Edit transaksi.
- Tambah transaksi manual.
- Tambah tagihan.
- Tandai tagihan paid.
- Clear raw logs tidak menghapus transaksi.
- Clear transactions tidak menghapus raw logs kecuali user memilih.

## 20. Build dan Release Notes

Update file:

- `README.md`
- `BUILD_APK.md`
- `app.json`
- `android/app/src/main/res/values/strings.xml`
- `android/app/build.gradle`

Perubahan branding:

- App label dari notification listener menjadi Shago Finote atau nama final.
- Package id bisa tetap `com.shago.notiflistener` untuk dev, tetapi untuk release sebaiknya diganti ke `com.shago.finote`.
- Splash icon perlu diganti agar sesuai finance app.

Catatan penting jika mengganti package id:

- Notification Access lama akan perlu diaktifkan ulang oleh user.
- SharedPreferences lama tidak otomatis sama jika app dianggap berbeda.
- Untuk MVP internal, package id lama boleh dipertahankan dulu.

## 21. Roadmap Implementasi

Bagian ini adalah urutan kerja yang disarankan untuk model AI implementer. Kerjakan berurutan. Jangan lompat ke UI besar sebelum data model, parser, dan repository siap.

### Phase 1 - Foundation

- Tambah struktur folder feature.
- Tambah type `FinancialTransaction`, `Category`, `BillReminder`.
- Tambah utility currency/date/id.
- Tambah local repository.
- Tambah default categories.

File yang dibuat:

- `src/features/transactions/types.ts`
- `src/features/bills/types.ts`
- `src/constants/categories.ts`
- `src/utils/currency.ts`
- `src/utils/date.ts`
- `src/utils/id.ts`
- `src/storage/localStore.ts`

File yang diubah:

- `package.json` jika menambah dependency storage.
- `App.tsx` hanya jika mulai menambahkan provider.

Acceptance criteria Phase 1:

- Tipe domain finance tersedia.
- Repository lokal bisa create/list/update/delete data.
- Tidak ada perubahan native yang merusak listener.
- Build TypeScript tidak error.

### Phase 2 - Notification to Transaction

- Tambah parser notifikasi.
- Tambah parser rules awal untuk bank/e-wallet Indonesia.
- Tambah deduplication.
- Tambah mark parsed/ignored di native module.
- Tambah raw notification debug screen.

File yang dibuat:

- `src/features/notificationCapture/types.ts`
- `src/features/notificationCapture/services/notificationParser.ts`
- `src/features/notificationCapture/services/parserRules.ts`
- `src/features/notificationCapture/services/notificationRepository.ts`
- `src/features/transactions/services/transactionNormalizer.ts`

File yang diubah:

- `src/types/NotificationLog.ts`
- `src/native/NotificationModule.ts`
- `android/app/src/main/java/com/shago/notiflistener/NotificationStore.kt`
- `android/app/src/main/java/com/shago/notiflistener/NotificationModule.kt`
- `android/app/src/main/java/com/shago/notiflistener/NotifListenerService.kt` jika perlu menambah `appLabel` atau metadata.

Acceptance criteria Phase 2:

- Raw notification tetap tersimpan.
- Log yang sudah diproses bisa ditandai parsed/ignored/duplicate.
- Parser bisa mengenali nominal Rupiah.
- Parser bisa membedakan income dan expense minimal dari keyword umum.
- Parser mengabaikan OTP, login, promo, dan notifikasi gagal transaksi.
- Transaksi duplikat tidak masuk dua kali.

### Phase 3 - Modern Finance UI

- Tambah navigation.
- Buat dashboard.
- Buat transaction list.
- Buat transaction detail.
- Buat transaction form manual/edit.
- Buat source apps screen.

File yang dibuat:

- `src/app/AppProviders.tsx`
- `src/app/navigation/RootNavigator.tsx`
- `src/features/dashboard/DashboardScreen.tsx`
- `src/features/transactions/TransactionsScreen.tsx`
- `src/features/transactions/TransactionDetailScreen.tsx`
- `src/features/transactions/TransactionFormScreen.tsx`
- `src/features/notificationCapture/SourceAppsScreen.tsx`
- `src/features/notificationCapture/RawNotificationsScreen.tsx`
- `src/features/settings/SettingsScreen.tsx`
- Komponen reusable di `src/components/`.

File yang diubah:

- `App.tsx`
- `src/screens/HomeScreen.tsx` bisa dipertahankan sementara atau dihapus setelah navigasi baru stabil.

Acceptance criteria Phase 3:

- Aplikasi tidak lagi tampil sebagai log viewer utama.
- Dashboard menjadi entry screen.
- User bisa lihat ringkasan pemasukan/pengeluaran.
- User bisa lihat list transaksi.
- User bisa tambah/edit transaksi manual.
- User bisa pilih source apps.
- User bisa buka raw notification dari area debug/settings.

### Phase 4 - Bills and Due Dates

- Tambah bill reminder model.
- Tambah bills screen.
- Tambah bill form.
- Tambah overdue/upcoming logic.
- Tambah local reminder jika dependency sudah dipilih.

File yang dibuat:

- `src/features/bills/BillsScreen.tsx`
- `src/features/bills/BillFormScreen.tsx`
- `src/features/bills/components/BillItem.tsx`
- `src/features/bills/services/billRepository.ts`

Acceptance criteria Phase 4:

- User bisa membuat catatan pembayaran keluar.
- User bisa mengatur tanggal jatuh tempo.
- User bisa melihat status upcoming/overdue/paid.
- User bisa menandai tagihan sudah dibayar.
- Jika reminder lokal belum dibuat, minimal status jatuh tempo tampil jelas di UI.

### Phase 5 - Backend Ready Layer

- Tambah sync queue.
- Tambah API client interface.
- Tambah `syncStatus` handling.
- Tambah placeholder settings sync.
- Dokumentasikan endpoint backend.

File yang dibuat:

- `src/types/Api.ts`
- `src/storage/syncQueue.ts`
- `src/services/apiClient.ts` atau `src/services/financeApiClient.ts`

Acceptance criteria Phase 5:

- Entity lokal punya `syncStatus` dan `remoteId`.
- Create/update/delete lokal bisa masuk sync queue.
- Belum ada request backend wajib saat app berjalan.
- API client bisa berupa interface/stub dulu.
- Struktur siap dipakai saat backend tersedia.

### Phase 6 - Hardening

- Tambah tests.
- Tambah parser fixtures.
- Tambah privacy copy.
- Update README.
- Build debug APK.
- QA di device Android real.

File yang dibuat atau diubah:

- Test parser.
- Test utility.
- `README.md`
- `BUILD_APK.md`

Acceptance criteria Phase 6:

- Parser punya fixture untuk beberapa contoh notifikasi.
- README menjelaskan fungsi baru finance tracker.
- BUILD_APK tetap valid.
- Debug APK bisa dibuat.
- Tidak ada permission sensitif tambahan yang tidak dijelaskan.

## 21.1 Checklist Implementasi untuk AI

Gunakan checklist ini saat mengerjakan:

- [ ] Baca `package.json`, `App.tsx`, `src/screens/HomeScreen.tsx`, `src/native/NotificationModule.ts`.
- [ ] Baca native files di `android/app/src/main/java/com/shago/notiflistener/`.
- [ ] Pastikan listener lama masih dipertahankan.
- [ ] Tambah data model finance.
- [ ] Tambah local repository.
- [ ] Tambah parser dan test fixtures.
- [ ] Tambah deduplication.
- [ ] Tambah mark parsed/ignored/duplicate ke native module.
- [ ] Tambah navigation.
- [ ] Buat dashboard.
- [ ] Buat transaksi list/detail/form.
- [ ] Buat source apps screen.
- [ ] Buat bills screen/form.
- [ ] Tambah sync queue dan API interface.
- [ ] Update README dan BUILD_APK.
- [ ] Jalankan lint/test/build yang tersedia.
- [ ] Catat command yang berhasil/gagal.

## 21.2 Format Laporan Akhir untuk AI Implementer

Setelah implementasi, model AI yang mengerjakan harus memberi laporan singkat dengan format:

```md
## Summary
- Perubahan utama 1
- Perubahan utama 2

## Files Changed
- path/file.ts: alasan perubahan

## Verification
- command yang dijalankan
- hasilnya

## Notes
- asumsi teknis
- batasan yang belum dikerjakan
- follow-up yang disarankan
```

## 22. Acceptance Criteria MVP

MVP dianggap selesai jika:

- User bisa mengaktifkan Notification Access dari aplikasi.
- User bisa memilih aplikasi bank/e-wallet sebagai source.
- Notifikasi transaksi masuk bisa berubah menjadi transaksi otomatis.
- Pemasukan dan pengeluaran tampil di dashboard.
- User bisa melihat, mencari, filter, edit, dan hapus transaksi.
- User bisa tambah transaksi manual.
- User bisa tambah pembayaran keluar dengan tanggal jatuh tempo.
- User bisa melihat tagihan upcoming dan overdue.
- Data tetap tersimpan setelah aplikasi ditutup.
- Raw notification bisa dilihat untuk debug.
- Tidak ada data dikirim ke server secara default.
- Struktur repository dan sync metadata sudah siap untuk integrasi backend.

## 23. Risiko Teknis

Risiko:

- Format notifikasi tiap bank/e-wallet berbeda dan bisa berubah.
- Beberapa aplikasi menyembunyikan nominal di notifikasi.
- Android vendor tertentu bisa membatasi background service.
- Notification Access bisa dimatikan user kapan saja.
- Parser salah klasifikasi transaksi.
- Duplikasi notifikasi dapat membuat transaksi ganda.

Mitigasi:

- Parser berbasis rules dan fixture test.
- Transaksi confidence rendah masuk review queue.
- Source app selection default ketat.
- Raw log disimpan untuk audit.
- Deduplication sebelum create transaksi.
- UI memberi status listener yang jelas.

## 24. Keputusan Teknis Awal

Keputusan yang disarankan:

- Tetap React Native CLI.
- Tetap Kotlin NotificationListenerService.
- Parsing dilakukan di JS/TypeScript agar mudah dites dan diubah.
- Native hanya capture raw notification dan expose API.
- MVP pakai local storage dulu.
- Backend integration disiapkan dengan repository, API interface, sync status, dan sync queue.
- Webhook lama tidak dihapus langsung, tetapi dipindah ke mode developer atau diganti perannya nanti.

## 25. Prompt Siap Pakai untuk Model AI Implementer

Gunakan prompt berikut jika ingin meminta model AI lain mengerjakan repo ini:

```md
Saya punya repo React Native Android di path project ini. Tolong revamp repo ini menjadi APK pencatatan keuangan otomatis bernama Shago Finote.

Baca seluruh file `REVAMP_FINOTE_PLAN.md` terlebih dahulu, lalu implementasikan sesuai plan.

Konteks penting:

- Repo saat ini sudah punya Android Notification Listener berbasis Kotlin.
- Modul notification listener wajib dipertahankan.
- Aplikasi baru harus membaca notifikasi m-banking/e-wallet dan mengubahnya menjadi transaksi pemasukan/pengeluaran otomatis.
- MVP harus local-only, tanpa backend.
- Struktur harus siap backend nanti.
- Jangan menambah SMS permission, Contacts permission, Call Log permission, atau AccessibilityService.
- Jangan mengirim data notifikasi ke server secara default.
- Webhook lama boleh dipertahankan sebagai debug/developer feature, tetapi jangan jadi fitur utama.

Kerjakan bertahap:

1. Audit repo dan pahami listener lama.
2. Tambah data model finance.
3. Tambah local repository.
4. Tambah parser notifikasi transaksi.
5. Tambah deduplication dan parse status.
6. Tambah UI modern: dashboard, transaksi, sumber app, tagihan, settings.
7. Tambah backend-ready layer: sync status, sync queue, API interface/stub.
8. Update README dan BUILD_APK.
9. Jalankan test/lint/build yang memungkinkan.

Output yang saya harapkan:

- Implementasi kode selesai.
- APK tetap bisa build.
- Fitur listener tetap jalan.
- Dashboard finance menjadi halaman utama.
- Transaksi otomatis dari notifikasi bisa tersimpan lokal.
- User bisa input transaksi manual dan tagihan jatuh tempo.
- Berikan laporan akhir berisi summary, files changed, verification, notes, dan follow-up.
```

## 26. Catatan untuk Review Setelah Implementasi

Saat model lain selesai mengerjakan, review dengan fokus:

- Apakah listener lama masih aktif dan tidak rusak.
- Apakah permission Android tetap minimal.
- Apakah parser tidak menyimpan OTP sebagai transaksi.
- Apakah transaksi tidak duplikat.
- Apakah UI utama bukan lagi raw notification log.
- Apakah data tersimpan lokal.
- Apakah struktur kode tidak semua ditaruh di satu file.
- Apakah backend-ready layer hanya interface/stub dan tidak wajib online.
- Apakah README dan BUILD_APK sesuai app baru.
- Apakah command verifikasi benar-benar dijalankan.

Jika implementasi terlalu besar dalam satu langkah, pecah menjadi PR/phase:

- PR 1: domain model, storage, parser.
- PR 2: native bridge update dan parse status.
- PR 3: navigation dan dashboard.
- PR 4: transaksi manual/edit/detail.
- PR 5: bills/due dates.
- PR 6: docs, tests, hardening.
