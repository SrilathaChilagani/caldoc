# CalDoc Mobile App

This Expo project wraps the existing CalDoc web experience and adds native patient flows (login, dashboard, visit deep links). The backend is the same Next.js deployment (`https://www.caldoc.in`), so no extra APIs are required.

## Scripts

```bash
npm start          # Expo dev server
npm run ios        # Open iOS simulator (needs Xcode)
npm run android    # Open Android emulator (needs Android Studio)
npm run lint       # Expo lint checks
npm run build:ios  # EAS production build for iOS
npm run build:android # EAS production build for Android
```

## Environment

- `EXPO_PUBLIC_API_BASE` (configured in `app.json`) points to the deployed CalDoc site. Update if you need staging vs production.
- Deep links use the `caldoc://` scheme plus `https://www.caldoc.in/app`. Example: `caldoc://visit/<appointmentId>?role=patient`.

### Using the OTP-bypass backend

When you need to work against the dev/test API that skips OTP (or accepts a fixed code such as `0000`), launch Expo with `APP_ENV=development`. The native config automatically switches `EXPO_PUBLIC_API_BASE` to `EXPO_PUBLIC_DEV_API_BASE` (defaults to `http://10.0.2.2:3000`, which reaches `localhost` from an Android emulator).

```bash
# In the Next.js backend repo, start the API that has OTP bypass enabled
npm run dev

# In this Expo app, point at that backend
APP_ENV=development npx expo start --android
```

If your bypass environment lives elsewhere, override `EXPO_PUBLIC_DEV_API_BASE` before starting Expo:

```bash
APP_ENV=development EXPO_PUBLIC_DEV_API_BASE=https://dev.myserver.com npx expo start
```

Use the OTP documented for that environment (or leave the field blank if the backend skips verification entirely).

## Building with EAS

1. Install the CLI once: `npm install -g eas-cli` (or use `npx eas`).
2. Authenticate: `eas login`.
3. Configure secrets/certs in the Expo dashboard (Apple developer + Google Play keystore).
4. For QA/internal:
   ```bash
   eas build --profile development --platform ios
   eas build --profile development --platform android
   ```
5. For preview builds sent to stakeholders:
   ```bash
   eas build --profile preview --platform ios
   eas build --profile preview --platform android
   ```
6. For store-ready binaries:
   ```bash
   npm run build:ios
   npm run build:android
   ```
7. Submit to stores (requires metadata ready in App Store Connect / Play Console):
   ```bash
   eas submit --platform ios --profile production
   eas submit --platform android --profile production
   ```

## QA Checklist

- Verify login/logout (Expo SecureStore clears token).
- Check dashboard appointments render and “Join visit” opens the in-app visit screen.
- Test deep links:
  - `npx uri-scheme open caldoc://visit/<id>?role=patient --ios`
  - `adb shell am start -W -a android.intent.action.VIEW -d "caldoc://visit/<id>?role=patient" com.caldoc.app`
- Run through a Daily/Jitsi visit in the WebView to ensure mic/camera permissions look correct on real devices.

## Assets & Store Listing

- Icons & splash assets live under `assets/images/`. Replace with final CalDoc branding before shipping.
- Prepare App Store / Play Store metadata: description, screenshots, privacy policy (`https://www.caldoc.in/privacy`), support URL, and the same `.env`-backed service links.

Once the build artifacts pass testing, upload them via App Store Connect / Google Play Console and roll out to TestFlight/Internal testing before production release.
