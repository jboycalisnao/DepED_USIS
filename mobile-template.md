# Modern React Native / Expo Mobile Application Template Guide

This document serves as the master blueprint and reference guide for bootstrapping, configuring, and maintaining production-grade React Native mobile applications using modern **Expo** and **EAS (Expo Application Services)**.

---

## 1. Project Initialization & Architecture

### 1.1 Create a Clean Project
Use the official Expo CLI with the blank or navigation template:

```bash
# Initialize a blank TypeScript or JavaScript project
npx create-expo-app@latest my-mobile-app --template blank

# Navigate to the workspace
cd my-mobile-app
```

> [!IMPORTANT]
> **Expo Package Management Rule**: Always use `npx expo install <package>` instead of `npm install`, `yarn add`, or `pnpm add`. `npx expo install` guarantees that installed native packages match the exact compatible versions for your installed Expo SDK.

---

### 1.2 Recommended Project Structure

Keep route screens isolated from reusable business logic and UI components:

```
my-mobile-app/
├── assets/                    # Static assets (icons, splash screen, adaptive icons)
│   ├── icon.png               # App icon (1024x1024)
│   ├── adaptive-icon.png      # Android foreground icon (1024x1024)
│   ├── splash-icon.png        # Launch splash screen image
│   └── favicon.png            # Web favicon
├── src/
│   ├── components/            # Reusable UI components (Buttons, Cards, Inputs, Modals)
│   ├── hooks/                 # Custom React hooks (e.g., useBiometrics, useOnlineStatus)
│   ├── screens/               # Main view containers (if not using Expo Router file-routing)
│   ├── services/              # API clients, local storage, security utilities
│   ├── constants/             # Design tokens, color schemes, theme definitions
│   └── types/                 # TypeScript type definitions (if using TS)
├── App.js                     # Root entry point & layout provider
├── app.json                   # Expo application metadata & config plugins
├── eas.json                   # EAS Build and deployment profiles
├── package.json
└── README.md
```

---

## 2. Core Dependencies & Essential Modules

Run the following command to equip the template with production-standard features:

```bash
# Essential UI, vector icons, fonts, and safe area handling
npx expo install @expo/vector-icons expo-font expo-status-bar react-native-safe-area-context

# Biometrics & Passkey hardware authentication
npx expo install expo-local-authentication

# Secure key-value storage (for tokens, biometric preferences, user session)
npx expo install expo-secure-store

# Cross-platform Web support
npx expo install react-native-web react-dom @expo/metro-runtime
```

---

## 3. Configuration Setup (`app.json`)

Configure your app identifiers, splash screen, icons, and native plugins in `app.json`:

```json
{
  "expo": {
    "name": "MyTemplateApp",
    "slug": "my-template-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.mytemplateapp"
    },
    "android": {
      "package": "com.yourcompany.mytemplateapp",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-font",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow $(PRODUCT_NAME) to authenticate using Face ID or Biometrics."
        }
      ]
    ]
  }
}
```

---

## 4. Reusable Biometric Passkey Pattern

Here is the production-ready biometric authentication service pattern to use across apps:

```javascript
// src/services/biometrics.js
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';

export async function authenticateWithBiometrics(customMessage = 'Authenticate with Biometric Passkey') {
  try {
    if (Platform.OS === 'web') {
      return { success: true, type: 'WebAuthn/Simulated' };
    }

    // 1. Verify device hardware
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert('Unsupported', 'This device does not support biometric authentication.');
      return { success: false, reason: 'NO_HARDWARE' };
    }

    // 2. Verify biometric enrollment
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      Alert.alert('Not Enrolled', 'No biometrics found. Please set up a fingerprint or Face ID in settings.');
      return { success: false, reason: 'NOT_ENROLLED' };
    }

    // 3. Prompt user
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: customMessage,
      fallbackLabel: 'Use Device PIN / Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result;
  } catch (error) {
    Alert.alert('Authentication Error', error.message || 'An unexpected error occurred.');
    return { success: false, error };
  }
}
```

---

## 5. UI & Design System Guidelines

When building screens and components for this template, follow clean, professional standards:

1. **Light Mode First**: Default to crisp, high-contrast light backgrounds (`#ffffff`, `#f8fafc`) with deep text (`#0f172a`, `#334155`).
2. **Subtle Elevation**: Use 1px borders (`#e2e8f0`) and subtle shadows rather than dark saturated borders or neon drop-shadows.
3. **Safe Area & Status Bar**: Always wrap top-level views in `SafeAreaView` from `react-native-safe-area-context` and configure `StatusBar` (`style="dark"`).
4. **Touch Ergonomics**: All interactive touch targets (`TouchableOpacity`, `Pressable`) should have at least 44x44 pt touch areas and `hitSlop` when small.

---

## 6. Build & Packaging Instructions (Generating APKs & Release Builds)

### 6.1 EAS Build Configuration (`eas.json`)
Create an `eas.json` file in the root directory:

```json
{
  "cli": {
    "version": ">= 15.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 6.2 Generating an APK File (Direct Android Installation)
To produce an installable `.apk` file for testing:

1. **Log into EAS**:
   ```bash
   eas login
   ```
2. **Run Cloud Build**:
   ```bash
   eas build -p android --profile preview
   ```
3. Once completed, EAS displays a QR code and URL to download the `.apk` directly to your phone.

### 6.3 Local Native Project Generation (Continuous Native Generation)
If you need direct Gradle or Xcode project files:

```bash
# Generate native android/ and ios/ directories based on app.json
npx expo prebuild

# Build Android APK directly on your machine
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. Quality Assurance & Health Checklist

Before committing code or preparing a release, run this checklist:

```bash
# 1. Verify project health and version compatibility
npx expo-doctor

# 2. Test bundle compilation across all platforms
npx expo export --dump-sourcemap=false

# 3. Clean up export artifacts after testing
# Windows PowerShell:
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
# macOS/Linux:
rm -rf dist
```

---

## 8. Quick Start Commands Reference

| Task | Command |
|---|---|
| Start Dev Server | `npx expo start` |
| Run on Android Device / Emulator | `npx expo start --android` |
| Run in Web Browser | `npx expo start --web` |
| Install New Module | `npx expo install <package-name>` |
| Build APK via EAS | `eas build -p android --profile preview` |
| Check Project Health | `npx expo-doctor` |
