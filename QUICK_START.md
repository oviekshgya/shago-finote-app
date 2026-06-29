# Shago Finote - Quick Start

## One Command to Run Everything

```bash
npm run dev:android
```

That's it! This command:
- ✅ Installs dependencies
- ✅ Starts Metro bundler
- ✅ Builds APK
- ✅ Installs to device
- ✅ Launches app

## Prerequisites

- **Android Device** (connected via USB with USB debugging enabled)
  OR **Emulator** running
- **Node.js 18+** installed
- **Android SDK** installed (via Android Studio)

## First Time Setup

1. Connect Android device or start emulator
2. Enable USB debugging on device
3. Run:
   ```bash
   npm run dev:android
   ```

Done! App will launch on your device.

## Development

### Edit Code
- Make changes to files in `src/`
- Metro bundler auto-reloads (watch changes)
- JavaScript changes reload instantly

### Rebuild Native
- Changes to `android/` folder require rebuild
- Just run `npm run dev:android` again

### View Logs
```bash
adb logcat
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Device not found | `adb kill-server && adb start-server && adb devices` |
| Port 8081 in use | `lsof -ti:8081 \| xargs kill -9` |
| Build failed | `cd android && ./gradlew clean && cd ..` |
| App won't start | `adb shell pm clear com.shagofintoe` |

## What Changed (UI Cleanup)

### Settings Screen
- Split into collapsible sections
- Status Listener (always open)
- Pilih Sumber Notifikasi (collapsible)
- Data Lokal (collapsible)
- Privasi & Keamanan (collapsible)

### Dashboard
- Better spacing between sections
- Cleaner period selector
- Improved chart layout

### Transactions
- Shows transaction count
- Better search & filter
- Cleaner styling

## New Components

```tsx
// Collapsible section wrapper
<SettingSection title="My Section" collapsible={true}>
  <Card>
    <Text>Content</Text>
  </Card>
</SettingSection>

// Reusable card
<Card variant="primary">
  <Text>Card content</Text>
</Card>
```

## File Structure

```
src/
├── screens/          ← Main UI
│   ├── DashboardScreen.tsx
│   ├── TransactionsScreen.tsx
│   ├── SettingsScreen.tsx
│   └── ...
├── components/       ← Reusable components
│   ├── SettingSection.tsx
│   └── Card.tsx
├── services/         ← Business logic
├── storage/          ← Data persistence
├── parser/           ← Notification parsing
├── hooks/            ← React hooks
├── utils/            ← Utilities
└── types/            ← TypeScript types
```

## Common Commands

```bash
# Start development
npm run dev:android

# Only start metro
npm start

# Build APK
cd android && ./gradlew assembleDebug && cd ..

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.shagofintoe/.MainActivity

# View logs
adb logcat

# List devices
adb devices

# Clear app data
adb shell pm clear com.shagofintoe
```

## Important Files

- `DEV_GUIDE.md` - Complete development guide
- `UI_CLEANUP_SUMMARY.md` - Detailed UI changes
- `REVAMP_FINOTE_PLAN.md` - Full product plan
- `IMPLEMENTATION_SUMMARY.md` - Code architecture

## Next Features

- Add transaction form
- Edit transaction functionality
- Category management
- Charts & analytics
- Bills & recurring payments
- Export functionality

## Support

If something doesn't work:
1. Check `DEV_GUIDE.md` for detailed troubleshooting
2. Check `adb logcat` for errors
3. Try clean build: `cd android && ./gradlew clean && cd ..`

---

**Ready?** Run `npm run dev:android` and start coding! 🚀
