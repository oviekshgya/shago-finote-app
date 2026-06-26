# Build APK - Shago Notif Listener

Panduan ini menjelaskan cara build APK debug dan release untuk aplikasi Shago Notif Listener.

## 1. Prasyarat

Pastikan sudah terinstall:

- Node.js LTS
- npm
- JDK sesuai kebutuhan React Native
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

1. Tekan **Aktifkan Listener**.
2. Android Settings akan terbuka.
3. Cari **Shago Notif Listener**.
4. Aktifkan akses Notification Access.
5. Kembali ke app.
6. Tekan **Refresh**.

## 4.1. Konfigurasi Webhook Opsional

Webhook mati secara default dan hanya aktif per group/package yang user pilih.

1. Tunggu sampai ada notifikasi masuk agar package muncul di tab **Groups**.
2. Buka tab **Groups**.
3. Tekan **Setting** pada package.
4. Isi URL webhook.
5. Pilih method `POST` atau `GET`.
6. Pilih auth: `none`, `bearer`, `basic`, atau `custom`.
7. Pilih field payload yang ingin dikirim.
8. Simpan konfigurasi.

Untuk `POST`, payload dikirim sebagai JSON body. Untuk `GET`, payload dikirim sebagai query parameter. Isi notifikasi seperti `title`, `text`, `subText`, dan `bigText` ikut dikirim jika field tersebut aktif di form webhook. App membutuhkan permission `INTERNET` untuk request webhook.

## 4.2. Filter Sumber Notifikasi

Di tab **Apps**, user bisa memilih apakah app menangkap semua notifikasi atau hanya package tertentu. Jika mode semua dimatikan, pilih aplikasi dari daftar Android yang boleh ditangkap. Notifikasi dari package yang tidak dipilih akan diabaikan sebelum masuk history atau webhook.

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

Dari root project atau folder `android/app`:

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

Untuk production, jangan simpan password asli di repo publik. Gunakan environment variable atau file lokal yang masuk `.gitignore`.

## 8. Konfigurasi Signing Release

File [android/app/build.gradle](/home/shagya/project/react/shago-notif-listener/android/app/build.gradle) sudah memiliki `signingConfigs.release`:

```gradle
signingConfigs {
    release {
        if (project.hasProperty("MYAPP_UPLOAD_STORE_FILE")) {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
}
```

Jika properti release belum diisi, build release MVP akan memakai debug signing agar command build tetap bisa diuji lokal. Untuk distribusi nyata, wajib pakai keystore release.

## 9. Build Release APK

```bash
cd android
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

Jika ingin publish ke Google Play, gunakan AAB:

```bash
cd android
./gradlew bundleRelease
```

Output biasanya ada di:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 11. Troubleshooting

### Gradle wrapper tidak jalan

Project ini menyertakan `android/gradlew`. Jika environment belum punya Gradle wrapper JAR atau Gradle global, install Gradle 8.10.x atau regenerasi wrapper:

```bash
cd android
gradle wrapper --gradle-version 8.10.2
```

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
