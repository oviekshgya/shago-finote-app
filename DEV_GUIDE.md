# Shago Finote - Development Guide

## Quick Start (One Command!)

```bash
npm run dev:android
```

This single command will:
1. Install dependencies
2. Start Metro bundler
3. Build debug APK
4. Install to device
5. Launch app

## What Changed - UI Cleanup

### 1. Settings Screen - Now Organized into Sections

**Before**: Cluttered with everything visible at once
**After**: Collapsible sections with clean organization

Sections:
- **Status Listener** - Always visible, quick access
- **Pilih Sumber Notifikasi** - Collapsible, app selection & rules
- **Data Lokal** - Collapsible, data management
- **Privasi & Keamanan** - Collapsible, privacy info

Each section uses a consistent card layout for better visual hierarchy.

### 2. Dashboard - Improved Spacing & Typography

- Better section spacing (20px instead of 24px margin-bottom)
- Cleaner period selector buttons
- Improved chart legend
- Better font sizing hierarchy

### 3. Transactions - Enhanced Usability

- Shows transaction count in header
- Better search placeholder text
- Improved filter buttons
- Cleaner date headers with better spacing
- Better transaction row spacing

### 4. New Reusable Components

Created shared components for consistency:

**SettingSection** (`src/components/SettingSection.tsx`)
- Wraps settings sections
- Optional collapsible with chevron
- Consistent styling

**Card** (`src/components/Card.tsx`)
- Reusable card container
- 3 variants: default, primary, accent
- Consistent padding & borders

## File Structure

```
src/
├── screens/
│   ├── DashboardScreen.tsx      (cleaned up spacing)
│   ├── TransactionsScreen.tsx   (enhanced UX)
│   ├── SettingsScreen.tsx       (organized into sections)
│   ├── AddTransactionScreen.tsx
│   ├── BillsScreen.tsx
│   └── SettingsScreen.tsx
├── components/
│   ├── SettingSection.tsx        (NEW: section wrapper)
│   └── Card.tsx                  (NEW: card container)
├── services/
├── storage/
├── parser/
├── hooks/
├── utils/
├── native/
└── types/

scripts/
├── dev-android.sh               (NEW: one-command dev setup)
└── run-android-debug.sh
```

## Development Workflow

### Start Development

```bash
npm run dev:android
```

The script will output:
```
[1/4] Checking prerequisites...
[2/4] Installing dependencies...
[3/4] Starting Metro bundler...
[4/4] Waiting for Android device...

Device: emulator-5554
Metro:  http://localhost:8081
```

### View Logs

```bash
adb logcat
```

### Useful Commands

```bash
# Just build APK
cd android && ./gradlew assembleDebug && cd ..

# Just install (if APK already built)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.shagofintoe/.MainActivity

# Clear app data
adb shell pm clear com.shagofintoe

# Uninstall
adb uninstall com.shagofintoe
```

### Device Management

```bash
# List devices
adb devices

# Switch device (if multiple connected)
adb -s <device_id> logcat

# Restart adb server
adb kill-server
adb start-server
```

## UI Changes Summary

### Colors (No Change)
- Background: `#111113`
- Cards: `#1b1b1f` / `#202024`
- Accent: `#c9152a` (BCA red)
- Text: `#ffffff` / `#9ca3af` / `#d1d5db`

### New Spacing Convention
- Section margins: 20px instead of 24px
- Padding: 14px (internal cards), 16px (screen padding)
- Gaps: 8-12px

### Font Sizing
- Headers (h1): 24px bold
- Section titles: 14-15px bold
- Body: 13px regular
- Labels: 11-12px gray

## Component Usage Examples

### SettingSection

```tsx
<SettingSection title="My Settings" collapsible={true} defaultOpen={false}>
  <Card>
    <Text>Content here</Text>
  </Card>
</SettingSection>
```

### Card

```tsx
<Card variant="primary">
  <Text>Default gray card</Text>
</Card>

<Card variant="accent">
  <Text>Accent/danger card</Text>
</Card>
```

## Common Issues

### Device Not Found
```bash
# Reconnect device via USB
# Or check emulator
adb kill-server
adb start-server
adb devices
```

### Metro Port Already in Use
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
# Then retry npm run dev:android
```

### Build Failed
```bash
# Clean gradle cache
cd android && ./gradlew clean && cd ..
# Then retry
npm run dev:android
```

## Performance Tips

1. **Live Reload**: Changes in JS files reload automatically
2. **Rebuild APK**: Only needed for native changes (Java/Kotlin)
3. **Clear Cache**: `adb shell pm clear com.shagofintoe` if UI looks broken
4. **Logcat**: Always check logcat for errors: `adb logcat | grep -i error`

## Next Steps

### Soon To Implement
- [ ] Add transaction form with validation
- [ ] Edit transaction functionality
- [ ] Category management UI
- [ ] Charts & analytics
- [ ] Bills management
- [ ] Export functionality

### Testing
Run on actual device for best experience, emulator may have performance issues.

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/ui-cleanup

# Make changes
git add src/

# Commit
git commit -m "refactor: cleanup UI sections and improve spacing"

# Push
git push origin feat/ui-cleanup

# Create PR
```

## Troubleshooting

If `npm run dev:android` fails:

1. Check prerequisites
   ```bash
   npm --version
   adb --version
   ```

2. Check device
   ```bash
   adb devices
   ```

3. Check logs
   ```bash
   npm start  # One terminal
   npm run android  # Another terminal
   adb logcat  # Third terminal
   ```

4. Manual build
   ```bash
   cd android
   ./gradlew assembleDebug
   adb install app/build/outputs/apk/debug/app-debug.apk
   cd ..
   ```
