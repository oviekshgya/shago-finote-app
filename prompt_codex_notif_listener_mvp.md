# Prompt Codex — Android Notification Listener MVP dengan React Native

Dokumen ini berisi prompt lengkap untuk Codex agar membuat aplikasi Android MVP berbasis React Native yang bisa menjadi listener notifikasi Android, mencatat notifikasi yang masuk, menampilkan list log, dan menyediakan panduan build APK.

> Catatan penting: fitur ini memakai akses sensitif Android Notification Access. Aplikasi tidak boleh membaca notifikasi secara diam-diam. User harus mengaktifkan akses secara manual dari Android Settings.

---

## 1. Prompt Utama untuk Codex

Salin seluruh prompt di bawah ini ke Codex.

```text
Kamu adalah senior mobile engineer React Native + Android Kotlin.
Buat aplikasi Android MVP bernama "Notif Listener MVP".

Tujuan aplikasi:
- Membaca notifikasi Android yang masuk melalui NotificationListenerService.
- Menyimpan notifikasi yang tertangkap ke local storage.
- Menampilkan list notifikasi di UI React Native.
- Menyediakan splash screen native Android.
- Menyediakan tombol untuk membuka Android Notification Listener Settings.
- Menyediakan panduan build APK lengkap dalam file Markdown.

Stack wajib:
- React Native CLI, bukan Expo managed.
- TypeScript untuk React Native UI.
- Kotlin untuk native Android service dan native module.
- Local storage MVP boleh memakai SharedPreferences JSON.
- Jangan memakai server/backend dulu.
- Jangan upload data ke internet.
- Jangan memakai accessibility service.
- Jangan membuat fitur stealth, spyware, keylogger, auto-forward OTP, atau auto-send data.

Target platform:
- Android saja untuk MVP.
- Minimum SDK ikuti default React Native project, tetapi pastikan kompatibel Android modern.
- Gunakan AndroidX.

Fitur utama:
1. Splash screen
   - Implementasikan splash screen native Android.
   - Gunakan Android 12 SplashScreen API / androidx.core:core-splashscreen jika diperlukan.
   - Splash menampilkan app icon dan warna brand.
   - Jangan membuat delay palsu yang memperlambat user.

2. Home screen React Native
   - Tampilkan judul: "Notif Listener MVP".
   - Tampilkan status listener:
     - "Listener aktif" jika notification access sudah diberikan.
     - "Listener belum aktif" jika belum diberikan.
   - Tombol "Aktifkan Listener" untuk membuka Android Settings notification listener.
   - Tombol "Refresh" untuk reload status dan data.
   - Tombol "Clear Logs" untuk menghapus riwayat lokal.
   - Tampilkan warning privacy yang jelas:
     "Aplikasi ini hanya membaca notifikasi setelah kamu mengaktifkan akses secara manual. Data disimpan lokal di perangkat dan tidak dikirim ke server."

3. Notification listener native Android
   - Buat Kotlin service bernama NotificationListenerServiceImpl atau NotifListenerService.
   - Extend android.service.notification.NotificationListenerService.
   - Override onNotificationPosted(sbn: StatusBarNotification).
   - Ambil data:
     - id lokal UUID
     - packageName
     - notification id dari sbn.id
     - tag dari sbn.tag jika ada
     - title dari Notification.EXTRA_TITLE
     - text dari Notification.EXTRA_TEXT
     - subText dari Notification.EXTRA_SUB_TEXT jika ada
     - bigText dari Notification.EXTRA_BIG_TEXT jika ada
     - postTime dari sbn.postTime
     - receivedAt dari System.currentTimeMillis()
   - Jangan crash jika title/text null.
   - Simpan ke SharedPreferences sebagai JSON array.
   - Batasi jumlah log maksimal 500 item agar storage tidak membengkak.
   - Log terbaru harus berada di atas.
   - Abaikan notifikasi dari package aplikasi sendiri agar tidak loop, kecuali ada alasan jelas.

4. AndroidManifest.xml
   - Deklarasikan service dengan:
     android.permission.BIND_NOTIFICATION_LISTENER_SERVICE
   - Tambahkan intent-filter:
     android.service.notification.NotificationListenerService
   - Pastikan exported=false.
   - Jika memakai POST_NOTIFICATIONS untuk app notification sendiri di Android 13+, jelaskan bahwa permission itu bukan untuk membaca notifikasi aplikasi lain.

5. Native module Kotlin untuk React Native
   Buat module bernama NotificationModule dengan method:
   - openSettings(): Promise<void>
     Membuka Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS.
   - isListenerEnabled(): Promise<Boolean>
     Mengecek apakah package aplikasi ini ada di Settings.Secure enabled_notification_listeners.
   - getLogs(): Promise<String>
     Mengembalikan JSON array string dari SharedPreferences.
   - clearLogs(): Promise<Boolean>
     Menghapus semua log.

   Jika memungkinkan, tambahkan event realtime:
   - Saat notifikasi baru masuk, native mengirim broadcast lokal atau event ke React Native.
   - React Native bisa refresh list ketika event diterima.
   - Jika event realtime terlalu kompleks, cukup tombol Refresh untuk MVP.

6. UI/UX detail
   Buat UI sederhana tetapi rapi:
   - SafeAreaView.
   - Header card status listener.
   - Button primary untuk aktifkan listener.
   - Button secondary Refresh.
   - Button danger Clear Logs.
   - FlatList untuk data notifikasi.
   - Empty state jika belum ada data.
   - Tiap item tampilkan:
     - app/packageName
     - title
     - text atau bigText
     - waktu dalam format lokal
   - Tambahkan detail modal saat item diklik.

7. Struktur folder yang diharapkan
   Buat struktur seperti ini, sesuaikan dengan template React Native terbaru:

   notif-listener-mvp/
   ├── App.tsx
   ├── package.json
   ├── README.md
   ├── BUILD_APK.md
   ├── src/
   │   ├── native/NotificationModule.ts
   │   ├── types/NotificationLog.ts
   │   ├── utils/formatDate.ts
   │   └── screens/HomeScreen.tsx
   └── android/
       └── app/src/main/java/<package>/
           ├── MainActivity.kt
           ├── MainApplication.kt
           ├── NotifListenerService.kt
           ├── NotificationModule.kt
           └── NotificationPackage.kt

8. TypeScript contract
   Buat type:

   export type NotificationLog = {
     id: string;
     packageName: string;
     notificationId?: number;
     tag?: string | null;
     title?: string;
     text?: string;
     subText?: string;
     bigText?: string;
     postTime: number;
     receivedAt: number;
   };

9. Privacy dan safety wajib
   - Tampilkan disclosure di UI sebelum user membuka settings.
   - Jangan menyembunyikan fitur listener.
   - Jangan membaca data untuk dikirim ke server.
   - Jangan membuat auto-forward OTP.
   - Jangan membuat auto-reply.
   - Jangan collect data sensitif di luar kebutuhan MVP.
   - Tambahkan README section "Privacy".
   - Tambahkan catatan bahwa user bisa mematikan akses kapan saja dari Android Settings > Notification Access.

10. File dokumentasi wajib dibuat
   Buat README.md berisi:
   - Nama project.
   - Deskripsi.
   - Fitur.
   - Requirement.
   - Cara install dependency.
   - Cara run debug ke Android.
   - Cara aktifkan listener.
   - Catatan privacy.
   - Troubleshooting.

   Buat BUILD_APK.md berisi:
   - Prasyarat Android Studio, JDK, Android SDK, Node.js.
   - Perintah install dependency.
   - Perintah build debug APK.
   - Lokasi output debug APK.
   - Cara membuat release keystore.
   - Cara konfigurasi android/gradle.properties.
   - Cara konfigurasi signingConfig release di android/app/build.gradle.
   - Perintah build release APK.
   - Lokasi output release APK.
   - Cara install APK ke device via adb.
   - Troubleshooting umum Gradle/SDK.

11. Command yang harus didukung dalam dokumentasi
   Gunakan command Linux/macOS:

   npm install
   npm run android
   cd android
   ./gradlew assembleDebug
   ./gradlew assembleRelease
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   adb install -r app/build/outputs/apk/release/app-release.apk

12. Acceptance criteria
   Aplikasi dianggap selesai jika:
   - Project bisa diinstall dependency tanpa error.
   - App bisa run di Android device/emulator.
   - Splash screen muncul saat launch.
   - Home screen tampil.
   - Tombol Aktifkan Listener membuka Android notification listener settings.
   - Status listener berubah setelah user mengaktifkan akses.
   - Saat ada notifikasi baru dari app lain, log tersimpan.
   - List menampilkan notifikasi yang tersimpan.
   - Clear Logs menghapus list.
   - Build debug APK berhasil.
   - Build release APK berhasil setelah keystore dikonfigurasi.

13. Jangan lakukan ini
   - Jangan pakai Expo managed.
   - Jangan pakai server.
   - Jangan upload data.
   - Jangan hardcode path lokal developer.
   - Jangan membuat dependency tidak perlu.
   - Jangan memakai AccessibilityService.
   - Jangan meminta permission SMS/Contacts/Call Log.
   - Jangan membuat background service tambahan selain NotificationListenerService.

Kerjakan implementasi penuh beserta file README.md dan BUILD_APK.md.
Jika ada versi React Native terbaru yang struktur file-nya sedikit berbeda, sesuaikan dengan best practice terbaru, tetapi fitur dan acceptance criteria wajib tetap terpenuhi.
```

---

## 2. Prompt Tambahan Jika Codex Belum Membuat Splash Screen dengan Benar

Pakai prompt lanjutan ini kalau splash screen belum muncul atau masih default putih.

```text
Perbaiki splash screen Android pada project React Native ini.

Requirement:
- Gunakan Android native splash screen yang kompatibel Android 12+.
- Tambahkan dependency androidx.core:core-splashscreen jika belum ada.
- MainActivity harus memanggil installSplashScreen() sebelum super.onCreate(null) atau sesuai struktur React Native terbaru.
- Tambahkan theme splash di styles.xml.
- Set windowSplashScreenBackground dengan warna brand.
- Set windowSplashScreenAnimatedIcon menggunakan drawable app icon sederhana.
- Setelah splash, masuk ke MainActivity React Native tanpa delay palsu.
- Pastikan build Android tidak error.
- Jelaskan file apa saja yang diubah.
```

---

## 3. Prompt Tambahan Jika Native Module Tidak Terbaca di React Native

```text
Perbaiki registrasi Native Module Android React Native.

Masalah:
NotificationModule belum tersedia di NativeModules pada JavaScript.

Requirement:
- Pastikan NotificationModule.kt extend ReactContextBaseJavaModule.
- Pastikan getName() mengembalikan "NotificationModule".
- Pastikan method diberi annotation @ReactMethod.
- Pastikan NotificationPackage.kt implements ReactPackage dan mengembalikan NotificationModule di createNativeModules().
- Pastikan package tersebut diregistrasikan di MainApplication.kt.
- Pastikan TypeScript wrapper src/native/NotificationModule.ts memvalidasi NativeModules.NotificationModule.
- Jika module null, tampilkan error yang jelas.
- Setelah fix, App.tsx bisa memanggil:
  NotificationModule.isListenerEnabled()
  NotificationModule.openSettings()
  NotificationModule.getLogs()
  NotificationModule.clearLogs()
```

---

## 4. Prompt Tambahan Jika Listener Tidak Menangkap Notifikasi

```text
Debug dan perbaiki NotificationListenerService.

Requirement:
- Pastikan service dideklarasikan di AndroidManifest.xml dengan permission android.permission.BIND_NOTIFICATION_LISTENER_SERVICE.
- Pastikan intent-filter action android.service.notification.NotificationListenerService ada.
- Pastikan exported=false.
- Tambahkan Log.d pada onListenerConnected(), onNotificationPosted(), dan onNotificationRemoved().
- Tambahkan fungsi isListenerEnabled() yang membaca Settings.Secure.getString(contentResolver, "enabled_notification_listeners").
- Pastikan user diarahkan ke Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS.
- Jangan minta runtime permission biasa untuk membaca notifikasi, karena Notification Listener harus diaktifkan manual dari Settings.
- Tambahkan bagian troubleshooting di README:
  1. Matikan lalu nyalakan lagi akses Notification Access.
  2. Force stop app lalu buka lagi.
  3. Restart device jika listener tidak connect.
  4. Cek logcat dengan tag NotifListener.
```

---

## 5. Template BUILD_APK.md yang Bisa Diminta ke Codex

Kalau Codex belum membuat dokumentasi build APK, suruh dia membuat file ini.

```markdown
# Build APK — Notif Listener MVP

Panduan ini menjelaskan cara build APK debug dan release untuk aplikasi Notif Listener MVP.

## 1. Prasyarat

Pastikan sudah terinstall:

- Node.js LTS
- npm atau yarn
- JDK sesuai kebutuhan versi React Native project
- Android Studio
- Android SDK
- Android SDK Platform Tools
- Android device dengan USB Debugging aktif atau Android Emulator

Cek instalasi:

```bash
node -v
npm -v
java -version
adb version
```

## 2. Install Dependency

Dari root project:

```bash
npm install
```

## 3. Jalankan Debug ke Device/Emulator

Pastikan device terdeteksi:

```bash
adb devices
```

Jalankan app:

```bash
npm run android
```

## 4. Aktifkan Notification Listener

Di dalam app:

1. Tekan tombol **Aktifkan Listener**.
2. Android Settings akan terbuka.
3. Cari **Notif Listener MVP**.
4. Aktifkan akses Notification Access.
5. Kembali ke app.
6. Tekan **Refresh**.

## 5. Build Debug APK

```bash
cd android
./gradlew assembleDebug
```

Output biasanya ada di:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install ke device:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 6. Buat Release Keystore

Dari root project atau folder android/app:

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore notif-listener-release-key.keystore \
  -alias notif-listener-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Simpan file ke:

```text
android/app/notif-listener-release-key.keystore
```

Jangan commit file keystore ke Git.

## 7. Konfigurasi android/gradle.properties

Tambahkan:

```properties
MYAPP_UPLOAD_STORE_FILE=notif-listener-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=notif-listener-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=isi_password_keystore
MYAPP_UPLOAD_KEY_PASSWORD=isi_password_key
```

Untuk project production, jangan simpan password asli di repo publik.
Gunakan environment variable atau file lokal yang masuk `.gitignore`.

## 8. Konfigurasi android/app/build.gradle

Pastikan bagian Android memiliki signingConfigs release:

```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
```

Catatan: struktur `build.gradle` bisa berbeda tergantung versi React Native. Sesuaikan tanpa menghapus konfigurasi default React Native.

## 9. Build Release APK

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

Output biasanya ada di:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Install ke device:

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

## 10. Build AAB untuk Play Store

Jika ingin publish ke Google Play, biasanya gunakan AAB:

```bash
cd android
./gradlew bundleRelease
```

Output biasanya ada di:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 11. Troubleshooting

### Device tidak terdeteksi

```bash
adb kill-server
adb start-server
adb devices
```

Pastikan USB Debugging aktif.

### Gradle permission denied

```bash
chmod +x android/gradlew
```

### SDK tidak ditemukan

Pastikan `ANDROID_HOME` atau `ANDROID_SDK_ROOT` benar.

Contoh Linux:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Listener tidak aktif

- Buka Android Settings > Notification Access.
- Matikan lalu aktifkan lagi akses untuk app.
- Restart app.
- Restart device jika masih gagal.
- Cek logcat:

```bash
adb logcat | grep NotifListener
```

### Notifikasi tidak muncul di list

- Pastikan ada notifikasi dari aplikasi lain.
- Pastikan notifikasi tidak disembunyikan oleh sistem/app sumber.
- Tekan Refresh.
- Pastikan Notification Access masih aktif.

## 12. Catatan Privacy

Aplikasi ini memakai Notification Access yang dapat membaca konten notifikasi.
Untuk MVP:

- Data hanya disimpan lokal.
- Data tidak dikirim ke server.
- User harus mengaktifkan akses secara manual.
- User bisa mematikan akses kapan saja dari Android Settings.
```

---

## 6. Checklist Review Setelah Codex Selesai

Gunakan checklist ini untuk memastikan hasil Codex benar.

```text
[ ] Project memakai React Native CLI, bukan Expo managed.
[ ] App.tsx atau HomeScreen.tsx berjalan tanpa error TypeScript.
[ ] NativeModules.NotificationModule tersedia.
[ ] NotificationModule.openSettings() membuka Notification Access Settings.
[ ] NotificationModule.isListenerEnabled() mengembalikan boolean benar.
[ ] AndroidManifest.xml punya NotificationListenerService.
[ ] Service memakai android.permission.BIND_NOTIFICATION_LISTENER_SERVICE.
[ ] Service punya intent-filter android.service.notification.NotificationListenerService.
[ ] onNotificationPosted() menyimpan log.
[ ] Log terbaru tampil di atas.
[ ] Clear Logs berfungsi.
[ ] Splash screen muncul saat app dibuka.
[ ] README.md tersedia.
[ ] BUILD_APK.md tersedia.
[ ] ./gradlew assembleDebug berhasil.
[ ] ./gradlew assembleRelease berhasil setelah signing dikonfigurasi.
[ ] Tidak ada upload data ke server.
[ ] Ada privacy disclosure di UI dan README.
```

---

## 7. Saran Nama Project dan Package

Rekomendasi:

```text
Project name : NotifListenerMVP
App label    : Notif Listener MVP
Package ID   : com.shago.notiflistenermvp
```

Kalau mau lebih netral:

```text
Project name : NotificationArchiveMVP
App label    : Notification Archive
Package ID   : com.example.notificationarchive
```

---

## 8. Catatan Penting untuk MVP

Untuk versi pertama, jangan langsung tambah fitur sinkronisasi server. Notification Access termasuk akses sensitif karena notifikasi bisa berisi pesan pribadi, kode OTP, transaksi, dan data personal lain.

Urutan aman:

1. Local-only MVP.
2. Tambahkan filter app/package.
3. Tambahkan export manual JSON/CSV jika diperlukan.
4. Baru pertimbangkan server sync dengan consent eksplisit, enkripsi, dan privacy policy.

