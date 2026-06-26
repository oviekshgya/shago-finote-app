# Shago Notif Listener

Android Notification Listener MVP berbasis React Native CLI, TypeScript, dan Kotlin.

## Fitur

- Splash screen native Android dengan asset SAAGO yang sama untuk app icon.
- Home screen React Native untuk melihat status listener.
- Tombol untuk membuka Android Notification Listener Settings.
- NotificationListenerService Kotlin untuk menangkap notifikasi dari aplikasi lain.
- Penyimpanan lokal memakai SharedPreferences JSON, maksimal 500 log.
- List log notifikasi, empty state, refresh, clear logs, dan modal detail.
- Group notifikasi berdasarkan `packageName` sumber.
- Webhook opt-in per group/package dengan method GET atau POST.
- Auth webhook: tanpa auth, Bearer token, Basic auth, atau custom headers JSON.
- Payload webhook bisa dipilih per field.
- History mencatat jam notifikasi masuk, status webhook, HTTP status/error, dan jam pengiriman webhook.
- Filter sumber notifikasi dari daftar aplikasi Android. Mode default menangkap semua; jika dimatikan, hanya package yang dipilih di tab **Apps** yang disimpan dan dikirim webhook.

## Requirement

- Node.js LTS atau versi modern yang kompatibel dengan React Native.
- npm.
- JDK.
- Android Studio.
- Android SDK dan Android SDK Platform Tools.
- Android device/emulator.

## Install Dependency

```bash
npm install
```

## Run Debug ke Android

Pastikan device/emulator aktif dan terdeteksi:

```bash
adb devices
npm run android
```

## Aktifkan Listener

1. Buka app.
2. Tekan **Aktifkan Listener**.
3. Android Settings akan membuka halaman Notification Access.
4. Cari **Shago Notif Listener**.
5. Aktifkan akses.
6. Kembali ke app dan tekan **Refresh**.

Notification Access harus diaktifkan manual oleh user. Aplikasi ini tidak bisa dan tidak boleh membaca notifikasi secara diam-diam.

## Privacy

Aplikasi ini hanya membaca notifikasi setelah user mengaktifkan Notification Access secara manual dari Android Settings. Data notifikasi disimpan lokal di perangkat memakai SharedPreferences.

Webhook tidak aktif secara default. Aplikasi hanya mengirim data keluar jika user membuka tab **Groups**, memilih package sumber notifikasi, mengaktifkan webhook, mengisi URL, dan menyimpan konfigurasi. Hindari mengirim OTP atau data sensitif ke endpoint yang tidak kamu kontrol.

Aplikasi ini tidak memakai server bawaan, tidak memakai AccessibilityService, tidak meminta permission SMS/Contacts/Call Log, tidak membuat auto-forward OTP khusus, dan tidak membuat auto-reply.

User bisa mematikan akses kapan saja dari Android Settings > Notification Access.

Catatan: permission `POST_NOTIFICATIONS` tidak dipakai untuk membaca notifikasi aplikasi lain. Permission tersebut hanya untuk aplikasi yang ingin menampilkan notifikasi miliknya sendiri di Android 13+.

Permission `INTERNET` dipakai hanya untuk mengirim request webhook yang dikonfigurasi user per group.

## Webhook Per Group

1. Aktifkan Notification Access.
2. Tunggu notifikasi dari aplikasi lain agar group/package muncul.
3. Buka tab **Groups**.
4. Tekan **Setting** pada package yang ingin dikirim ke webhook.
5. Aktifkan webhook, isi URL, pilih `POST` atau `GET`, pilih auth, lalu pilih field payload.
6. Tekan **Simpan**.

Untuk `POST`, payload dikirim sebagai JSON body. Untuk `GET`, payload dikirim sebagai query parameter. Isi notifikasi yang bisa dikirim mencakup `title`, `text`, `subText`, `bigText`, `packageName`, `notificationId`, `tag`, `postTime`, dan `receivedAt`; field bisa dipilih dari form webhook. Status hasil kirim terlihat di history dan detail notifikasi.

## Filter Aplikasi

Tab **Apps** menampilkan aplikasi launcher yang terpasang di Android. Aktifkan mode filter dengan mematikan **capture semua**, lalu pilih aplikasi/package yang boleh ditangkap. NotificationListenerService akan mengabaikan notifikasi dari package lain sebelum log disimpan atau webhook dikirim.

## Struktur Penting

- [App.tsx](/home/shagya/project/react/shago-notif-listener/App.tsx)
- [HomeScreen.tsx](/home/shagya/project/react/shago-notif-listener/src/screens/HomeScreen.tsx)
- [NotificationModule.ts](/home/shagya/project/react/shago-notif-listener/src/native/NotificationModule.ts)
- [NotifListenerService.kt](/home/shagya/project/react/shago-notif-listener/android/app/src/main/java/com/shago/notiflistener/NotifListenerService.kt)
- [NotificationModule.kt](/home/shagya/project/react/shago-notif-listener/android/app/src/main/java/com/shago/notiflistener/NotificationModule.kt)
- [AndroidManifest.xml](/home/shagya/project/react/shago-notif-listener/android/app/src/main/AndroidManifest.xml)

## Troubleshooting

Jika listener tidak menangkap notifikasi:

1. Buka Android Settings > Notification Access.
2. Matikan lalu aktifkan lagi akses untuk **Shago Notif Listener**.
3. Force stop app lalu buka lagi.
4. Restart device jika listener tidak connect.
5. Cek logcat:

```bash
adb logcat | grep NotifListener
```

Jika native module tidak tersedia, pastikan `NotificationPackage()` sudah ditambahkan di `MainApplication.kt`, lalu bersihkan build Android:

```bash
cd android
./gradlew clean
```

Jika splash masih default putih, pastikan `MainActivity` memakai theme `Theme.App.Starting`, `installSplashScreen()` dipanggil sebelum `super.onCreate(null)`, dan resource `@drawable/shago_splash_icon` tersedia.
