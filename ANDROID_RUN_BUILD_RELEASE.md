# Android Run, Debug Build, dan Release APK

Panduan ini untuk menjalankan project React Native Android di device fisik, membuat APK debug, dan membuat APK release dengan signing key.

Project ini memakai React Native CLI dan Android native module, jadi fitur Notification Listener hanya bisa dites di Android device/emulator, bukan web.

## 1. Cara Run Debug Android ke HP

### 1.1 Prasyarat

Pastikan sudah terinstall:

- Node.js yang kompatibel dengan React Native.
- npm.
- Android SDK.
- ADB.
- JDK 17.

Project ini lebih aman dijalankan memakai JDK 17. Jika Java default di mesin adalah Java 25 atau versi terlalu baru, pakai JDK 17 secara eksplisit.

Cek Java:

```bash
java -version
```

Jika belum JDK 17, install:

```bash
sudo apt install openjdk-17-jdk
```

Set Java 17 untuk terminal saat ini:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

Output yang diharapkan:

```text
openjdk version "17..."
```

### 1.2 Aktifkan USB Debugging di HP

Di HP Android:

1. Buka Settings.
2. Aktifkan Developer Options.
3. Aktifkan USB Debugging.
4. Colok HP ke laptop memakai kabel data.
5. Jika muncul RSA fingerprint prompt, pilih Allow.
6. Ubah USB mode ke File Transfer / MTP jika device belum terbaca.

Cek device:

```bash
adb devices
```

Output yang benar:

```text
List of devices attached
RRGL101RGDE     device
```

Jika status `unauthorized`, cek popup authorization di HP.

Jika list kosong:

- Cabut-colok kabel.
- Ganti kabel data.
- Aktifkan ulang USB Debugging.
- Ganti USB mode ke File Transfer / MTP.
- Jalankan:

```bash
adb kill-server
adb start-server
adb devices
```

### 1.3 Install Dependency

Dari root repo:

```bash
cd ~/project/react/shago-finote-app
npm install
```

### 1.4 Stop Gradle Daemon Lama

Jika sebelumnya pernah menjalankan build dengan Java versi lain, stop Gradle daemon:

```bash
cd ~/project/react/shago-finote-app/android
./gradlew --stop
cd ..
```

Cek Gradle memakai Java 17:

```bash
cd android
./gradlew --version
cd ..
```

Pastikan output berisi:

```text
Launcher JVM:  17...
Daemon JVM:    /usr/lib/jvm/java-17-openjdk-amd64
```

Jika masih muncul Java 25 atau versi lain, jalankan command dengan `JAVA_HOME` eksplisit seperti di bagian berikut.

### 1.5 Run Android Debug

Dari root repo:

```bash
cd ~/project/react/shago-finote-app
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
npm run android
```

Jika shell sering mengubah Java default, gunakan command sekali jalan:

```bash
cd ~/project/react/shago-finote-app
bash -lc 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export PATH="$JAVA_HOME/bin:$PATH"; npm run android'
```

Build pertama bisa lama karena Gradle mengunduh dependency dan membuat cache.

### 1.6 Jalankan Metro Manual Jika Perlu

Biasanya `npm run android` akan menjalankan Metro otomatis. Jika app terinstall tapi stuck/loading, buka terminal kedua:

```bash
cd ~/project/react/shago-finote-app
npm run start
```

Lalu reload app di HP.

### 1.7 Test Notification Listener

Setelah app terinstall:

1. Buka app di HP.
2. Tekan tombol untuk membuka Notification Access.
3. Aktifkan akses untuk aplikasi ini.
4. Kirim atau tunggu notifikasi dari aplikasi lain.
5. Kembali ke app dan refresh log.

Catatan:

- Notification Access harus diaktifkan manual oleh user.
- Permission `POST_NOTIFICATIONS` bukan untuk membaca notifikasi aplikasi lain.
- Fitur listener tidak bisa dites di web.

## 2. Build APK Debug Android

APK debug cocok untuk test internal. APK ini memakai debug keystore dan tidak cocok untuk publish production.

### 2.1 Build Debug APK

Dari root repo:

```bash
cd ~/project/react/shago-finote-app
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
cd android
./gradlew assembleDebug
```

Atau sekali jalan:

```bash
cd ~/project/react/shago-finote-app
bash -lc 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export PATH="$JAVA_HOME/bin:$PATH"; cd android; ./gradlew assembleDebug'
```

Output APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### 2.2 Install APK Debug ke HP

Pastikan HP terbaca:

```bash
adb devices
```

Install APK:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Jika gagal karena signature berbeda atau versi lama, uninstall app dulu:

```bash
adb uninstall com.shago.finote
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Catatan:

- Uninstall akan menghapus data lokal aplikasi.
- Setelah uninstall/install ulang, Notification Access perlu diaktifkan lagi.

## 3. Release APK dengan Key Android

Release APK harus ditandatangani dengan keystore sendiri. Jangan pakai debug keystore untuk release production.

## 3.1 Buat Keystore Release

Dari root repo atau folder `android/app`:

```bash
cd ~/project/react/shago-finote-app/android/app
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore shago-finote-release-key.keystore \
  -alias shago-finote-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Simpan password dengan aman. Jika keystore hilang, update aplikasi dengan signature yang sama tidak bisa dilakukan.

File keystore:

```text
android/app/shago-finote-release-key.keystore
```

## 3.2 Tambahkan Konfigurasi Signing ke Gradle Properties

Edit file:

```text
android/gradle.properties
```

Tambahkan:

```properties
MYAPP_UPLOAD_STORE_FILE=shago-finote-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=shago-finote-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=ISI_PASSWORD_STORE
MYAPP_UPLOAD_KEY_PASSWORD=ISI_PASSWORD_KEY
```

Catatan keamanan:

- Jangan commit password asli ke repo publik.
- Untuk repo publik/production, simpan value sensitif di environment variable atau secret CI.
- Untuk private/local build, `gradle.properties` lokal masih bisa dipakai.

## 3.3 Pastikan Build Gradle Sudah Memakai Signing Config Release

File:

```text
android/app/build.gradle
```

Project ini sudah punya blok `signingConfigs.release` dan `buildTypes.release` yang membaca property:

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

Jika property tersedia, release build akan memakai keystore release. Jika tidak tersedia, konfigurasi saat ini fallback ke debug signing untuk release internal.

Untuk release production, pastikan property keystore release sudah benar.

## 3.4 Build Release APK

Dari root repo:

```bash
cd ~/project/react/shago-finote-app
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
cd android
./gradlew assembleRelease
```

Atau sekali jalan:

```bash
cd ~/project/react/shago-finote-app
bash -lc 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export PATH="$JAVA_HOME/bin:$PATH"; cd android; ./gradlew assembleRelease'
```

Output APK release:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## 3.5 Install Release APK ke HP

Jika sebelumnya install debug APK dengan package yang sama, uninstall dulu karena signature bisa berbeda:

```bash
adb uninstall com.shago.finote
adb install android/app/build/outputs/apk/release/app-release.apk
```

Catatan:

- Uninstall menghapus data lokal.
- Notification Access harus diaktifkan ulang setelah install release.

## 3.6 Verifikasi Signature APK

Gunakan `apksigner` dari Android SDK build-tools:

```bash
~/Android/Sdk/build-tools/37.0.0/apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk
```

Jika versi build-tools berbeda, cek folder:

```bash
ls ~/Android/Sdk/build-tools
```

Lalu pakai path versi yang tersedia.

## 3.7 Build AAB untuk Play Store

Jika nanti ingin publish ke Play Store, biasanya gunakan Android App Bundle:

```bash
cd ~/project/react/shago-finote-app
bash -lc 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export PATH="$JAVA_HOME/bin:$PATH"; cd android; ./gradlew bundleRelease'
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### Error `Error resolving plugin [id: 'com.facebook.react.settings'] > 25.0.2`

Penyebab umum: Gradle masih memakai Java 25.

Solusi:

```bash
cd ~/project/react/shago-finote-app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew --stop
./gradlew --version
```

Pastikan `Launcher JVM` dan `Daemon JVM` memakai Java 17.

Lalu build ulang:

```bash
cd ..
npm run android
```

### ADB Tidak Mendeteksi HP

Cek:

```bash
adb devices
```

Jika kosong:

- Pastikan kabel mendukung data.
- Aktifkan USB Debugging.
- Pilih File Transfer / MTP.
- Accept RSA fingerprint prompt di HP.
- Restart ADB:

```bash
adb kill-server
adb start-server
adb devices
```

### App Terinstall Tapi Tidak Bisa Connect Metro

Jalankan Metro manual:

```bash
cd ~/project/react/shago-finote-app
npm run start
```

Jika masih gagal, pastikan HP dan laptop bisa terhubung via USB debugging, lalu reload app.

### Notification Listener Tidak Menangkap Notifikasi

Cek:

- Notification Access sudah aktif untuk aplikasi ini.
- Notifikasi dari app sumber benar-benar muncul di notification shade.
- Source app tidak difilter keluar.
- Matikan lalu nyalakan lagi Notification Access.
- Restart device jika listener tidak connect.
