# PadiPlug Android Build Guide (APK & AAB)

## ✅ Pre-Build Setup Complete

The following fixes have been applied:
- ✅ Created Flutter asset directories (images, icons, animations, fonts)
- ✅ Installed Flutter dependencies (`flutter pub get`)
- ✅ Fixed Capacitor production config (removed dev server URL)
- ✅ Created dist/ folder structure

---

## 🚀 Building Android APK

### Quick Start (Production Build)

```bash
cd c:\padi-plug-connect-main\flutter-app
flutter build apk --release
```

**Build will be saved at:**
```
c:\padi-plug-connect-main\flutter-app\build\app\outputs\flutter-apk\app-release.apk
```

**Time estimate:** 15-30 minutes (first build) or 5-10 minutes (subsequent builds)

---

## 📦 Building Android App Bundle (AAB) for Google Play

### Prerequisites for AAB

1. **Java SDK installed** - Check with: `java -version`
2. **Android SDK installed** - Check with: `flutter doctor`
3. **Gradle configured** - Should be automatic with Flutter

### Build AAB Command

```bash
cd c:\padi-plug-connect-main\flutter-app
flutter build appbundle --release
```

**Build will be saved at:**
```
c:\padi-plug-connect-main\flutter-app\build\app\outputs\bundle\release\app-release.aab
```

**Time estimate:** 15-30 minutes (similar to APK)

---

## 🔑 App Signing (Production Only)

For production releases, you need to sign the APK/AAB with a keystore.

### Create Signing Keystore (First Time Only)

```bash
cd c:\padi-plug-connect-main\flutter-app

# Create keystore (you'll be prompted for passwords)
keytool -genkey -v -keystore android/key.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -alias upload-key
```

**Keep this file safe!** Store it securely and don't commit to git.

### Create key.properties for Signing

Create `c:\padi-plug-connect-main\flutter-app\android\key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=upload-key
storeFile=key.jks
```

After adding this file, builds will automatically be signed.

---

## 📋 Build Options

### Debug Build (for testing)
```bash
flutter build apk --debug
```
- Faster build
- Larger file size
- Cannot upload to Play Store
- Good for local testing

### Release Build (for production)
```bash
flutter build apk --release
```
- Smaller file size
- Optimized performance
- Can upload to Play Store
- Recommended for deployment

### With Specific Target Platform

```bash
# Build for specific ARM architecture
flutter build apk --release --target-platform android-arm64

# Options: android-arm, android-arm64, android-x64
```

---

## 🔍 Troubleshooting Build Issues

### Issue: "Gradle build failed"
**Solution:** 
```bash
cd flutter-app/android
./gradlew clean
cd ..
flutter pub get
flutter build apk --release
```

### Issue: "Java not found"
**Solution:** Install Java SDK from oracle.com or use:
```bash
choco install openjdk
```

### Issue: "OutOfMemory" error
**Solution:** Increase Gradle memory:
```bash
# Add to flutter-app/android/gradle.properties
org.gradle.jvmargs=-Xmx4096m
```

### Issue: Build takes very long
**Solution:** First builds are slow (downloading Gradle, building Dart). Subsequent builds are faster.

---

## 📊 Build Output Location

After successful build:

```
flutter-app/
├── build/
│   └── app/
│       └── outputs/
│           ├── flutter-apk/
│           │   └── app-release.apk          ← Release APK
│           │   └── app-debug.apk            ← Debug APK
│           └── bundle/
│               └── release/
│                   └── app-release.aab      ← Release AAB (for Play Store)
```

---

## 📱 After Building

### For APK:
1. Install on device: `flutter install build/app/outputs/flutter-apk/app-release.apk`
2. Test all features
3. Upload to Google Play Console

### For AAB:
1. Upload directly to Google Play Console
2. Google Play automatically generates optimized APKs for each device

### For iOS (macOS only):
```bash
flutter build ios --release
# Then open in Xcode: open ios/Runner.xcworkspace
```

---

## 🎯 Google Play Store Submission

### Step 1: Prepare Metadata
- App title: "PadiPlug"
- App description: Write compelling description
- Category: Shopping
- Content rating: Fill form
- Privacy policy: Add URL
- Screenshots: 2-5 high-quality images

### Step 2: Build Upload
1. Generate AAB: `flutter build appbundle --release`
2. Go to Google Play Console
3. Create new app → "PadiPlug"
4. Complete store listing
5. Upload AAB to Internal Testing track first
6. Test with TestFlight (beta testers)
7. Move to Production track

### Step 3: Review & Launch
1. Submit for review
2. Google reviews (typically 24-48 hours)
3. Upon approval: Publish to Play Store

---

## 📝 Build Automation Script

Save as `build-release.ps1`:

```powershell
# PadiPlug Release Build Script

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputDir = "build-output\$timestamp"
New-Item -ItemType Directory -Path $outputDir -Force

cd flutter-app

Write-Host "🏗️  Building APK..." -ForegroundColor Green
flutter build apk --release
Copy-Item "build\app\outputs\flutter-apk\app-release.apk" "$outputDir\padiplug-$timestamp.apk"

Write-Host "📦 Building AAB..." -ForegroundColor Green
flutter build appbundle --release
Copy-Item "build\app\outputs\bundle\release\app-release.aab" "$outputDir\padiplug-$timestamp.aab"

Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "Files saved to: $(Get-Location)\$outputDir" -ForegroundColor Cyan
```

Run with: `.\build-release.ps1`

---

## ⚡ Tips for Faster Builds

1. **Use incremental builds** - Flutter caches changes
2. **Build only needed architectures** - Use `--target-platform`
3. **Disable analytics** - `flutter config --no-analytics`
4. **Use split APKs** for faster local testing:
   ```bash
   flutter build apk --debug --split-per-abi
   ```

---

## 📚 Resources

- **Flutter Build Docs:** https://flutter.dev/docs/deployment/android
- **Google Play Console:** https://play.google.com/console/
- **App Signing:** https://developer.android.com/studio/publish/app-signing
- **AAB Format:** https://developer.android.com/guide/app-bundle

---

## ✅ Checklist Before Submission

- [ ] APK builds successfully
- [ ] AAB builds successfully  
- [ ] App is signed with release keystore
- [ ] All features tested on real device
- [ ] No console errors or warnings
- [ ] App version bumped (pubspec.yaml)
- [ ] Privacy policy written and accessible
- [ ] Terms of service written and accessible
- [ ] App icons included (all sizes)
- [ ] Screenshots prepared (2-5 per device type)
- [ ] Google Play Console account created
- [ ] Developer account enrolled ($25 one-time fee)

---

## Next Steps

1. Run: `cd c:\padi-plug-connect-main\flutter-app && flutter build apk --release`
2. Wait 15-30 minutes for build to complete
3. Run: `cd c:\padi-plug-connect-main\flutter-app && flutter build appbundle --release`
4. Upload AAB to Google Play Console
5. Submit for review

**Estimated total time:** 1-2 hours for first complete build

---

Generated: August 9, 2026
