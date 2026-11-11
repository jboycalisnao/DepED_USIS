# USIS School Portal Mobile Application

Official React Native / Expo mobile application for the **DepED USIS (Unified School Information System)** School Portal, serving learners, guardians, and school operations at **Leon National High School (School ID: 302522)**.

Built in accordance with the [Modern React Native / Expo Mobile Application Template Guide](../mobile-template.md).

---

## 1. Key Features

- **DepEd Institutional Branding**: Styled following official Department of Education color standards (DepEd Blue, Flag Red, Gold) and clean light surfaces.
- **USIS Favicon Integration**: Uses `common/assets/USIS_Icon.png` for the application icon, adaptive icons, splash screen, and web favicon.
- **Biometric Passkey Authentication**: Hardware fingerprint and Face ID authentication via `expo-local-authentication` with PIN/passcode fallback.
- **Secure Storage**: Local sessions and biometric preferences stored via `expo-secure-store`.
- **SF9 Learner Report Card**: Quarterly grades breakdown (Q1-Q4), general weighted average, and academic honor standing.
- **Daily RFID Attendance Log**: Gate tap timestamps, daily entry/exit times, and monthly attendance percentages.
- **Student Services Hub**:
  - Request official documents (Form 137 / SF10, Good Moral Certificate, Certificate of Enrollment).
  - Guidance and learner wellness support.
  - Help desk and registrar ticket tracking.
  - DepEd Microsoft 365 student account verification.
  - SPTA clearance and uniform/supplies hub.

---

## 2. Architecture & File Structure

```
school-portal-mobile/
├── assets/
│   ├── icon.png                 # Main USIS app icon (1024x1024)
│   ├── adaptive-icon.png        # Android foreground icon
│   ├── splash-icon.png          # Launch splash screen
│   └── favicon.png              # Web favicon
├── src/
│   ├── components/              # Institutional UI components
│   │   ├── Button.tsx           # Accessible 44pt touch buttons
│   │   ├── Card.tsx             # 12px border-radius standard card
│   │   ├── Header.tsx           # DepED USIS branding header
│   │   ├── Input.tsx            # Form controls with validation
│   │   └── Modal.tsx            # Clean USIS overlay modals
│   ├── constants/
│   │   └── theme.ts             # DepEd visual palette & tokens
│   ├── screens/
│   │   ├── LoginScreen.tsx      # LRN, Passcode & Biometric login
│   │   ├── DashboardScreen.tsx  # Overview, quick metrics, announcements
│   │   ├── GradesScreen.tsx     # SF9 subject grades & quarter chips
│   │   ├── AttendanceScreen.tsx # RFID gate tap stream & summaries
│   │   ├── ServicesScreen.tsx   # Document requests & services directory
│   │   └── ProfileScreen.tsx    # Academic info & biometric toggle
│   ├── services/
│   │   ├── authStorage.ts       # SecureStore session & preferences
│   │   ├── biometrics.ts        # Expo LocalAuthentication passkeys
│   │   └── portalData.ts        # Portal records and mock data
│   └── types/
│       └── index.ts             # TypeScript definitions
├── App.tsx                      # Root component & bottom tab navigation
├── app.json                     # Expo configuration & native plugins
├── eas.json                     # EAS build profiles for preview & APK
├── package.json
└── README.md
```

---

## 3. Getting Started

### 3.1 Install Dependencies
Always use `npx expo install` for native module additions:

```bash
cd school-portal-mobile
npm install
```

### 3.2 Running the Development Server

| Target | Command |
|---|---|
| **Expo Dev Server (QR Code for Expo Go)** | `npx expo start` |
| **Android Emulator / Device** | `npx expo start --android` |
| **Web Browser Preview** | `npx expo start --web` |
| **iOS Simulator (macOS only)** | `npx expo start --ios` |

---

## 4. Building the Android APK (EAS Build)

To generate an installable Android `.apk` file:

1. Log into your Expo Application Services account:
   ```bash
   eas login
   ```
2. Run the preview profile configured in `eas.json`:
   ```bash
   eas build -p android --profile preview
   ```
3. Once completed, download and install the generated `.apk` file directly on any Android device.

---

## 5. Health Check & Validation

Run the project health checklist:

```bash
# 1. Project health check
npx expo-doctor

# 2. Compile static export bundle (web/native test)
npx expo export --dump-sourcemap=false
```
