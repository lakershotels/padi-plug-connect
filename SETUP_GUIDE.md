# PadiPlug Setup & Build Guide

## Overview

This guide covers:
- ✅ Supabase backend setup
- ✅ Flutter app development and builds
- ✅ Android APK & AAB generation
- ✅ iOS app build and App Store preparation
- ✅ Google Play Store submission
- ✅ Apple App Store submission

## Prerequisites

- Node.js 18+ and npm
- Flutter SDK (3.16.0+)
- Xcode 15+ (for iOS development)
- Android SDK (for Android development)
- Git

## 1. Supabase Backend Setup

### Environment Variables
Your Supabase credentials are already configured:

```
Supabase URL: https://lhmrvpvbhymtqqkyystr.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobXJ2cHZiaHltdHFxa3l5c3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE4MDEsImV4cCI6MjEwMTYxNzgwMX0.2d16X4Fc4L3gnKFjZVC_DOpM-NBnAZfF4TkqGoKlym8
```

### Database Schema

Create the following tables in Supabase:

```sql
-- Users table (extends Supabase auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'customer',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  category TEXT,
  image_urls TEXT[],
  stock_quantity INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  quantity INT,
  total_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wallet table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id),
  balance DECIMAL(15, 2) DEFAULT 0,
  pending_balance DECIMAL(15, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Enable Row Level Security (RLS)

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## 2. Web Setup (React)

### Development

```bash
npm install
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

### Deploy to Cloudflare Workers

```bash
npm run build:worker
npm run publish:worker
```

## 3. Flutter Setup

### Install Flutter Dependencies

```bash
cd flutter
flutter pub get
```

### Development

```bash
flutter run
```

For specific device:
```bash
flutter run -d <device_id>
```

### Generate Screens and Models

```bash
cd flutter
flutter pub run build_runner build
```

## 4. Build Android APK

### Prerequisites

1. Create keystore:
```bash
keytool -genkey -v -keystore ~/.android/padi_keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias padi_key
```

2. Set environment variables:
```bash
export KEYSTORE_PATH="$HOME/.android/padi_keystore.jks"
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_ALIAS="padi_key"
export KEY_PASSWORD="your_key_password"
```

### Build APK

```bash
cd flutter
flutter build apk --release --split-per-abi
```

Output: `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`

## 5. Build Android App Bundle (AAB) for Play Store

```bash
cd flutter
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

## 6. Build iOS

### Prerequisites

1. Open iOS project in Xcode:
```bash
cd flutter/ios
open Runner.xcworkspace
```

2. Configure signing:
   - Select Runner project
   - Go to Signing & Capabilities
   - Select your development team

### Build for Testing

```bash
cd flutter
flutter build ios --release --no-codesign
```

### Build for App Store

```bash
cd flutter
flutter build ios --release
```

Then in Xcode:
1. Select Runner project
2. Build → Archive
3. Distribute App → App Store Connect

## 7. Google Play Store Submission

### Prepare

1. Create Google Play Developer account ($25 one-time fee)
2. Create app listing in Google Play Console
3. Generate AAB build (see section 5)

### Steps

1. Go to Google Play Console
2. Select your app
3. Navigate to Release → Production
4. Upload AAB file
5. Add release notes
6. Review and publish

**Timeline**: 2-3 hours for review

## 8. Apple App Store Submission

### Prepare

1. Create Apple Developer account ($99/year)
2. Create app in App Store Connect
3. Configure signing certificates

### Steps

1. In Xcode, archive app:
   - Product → Archive
   - Validate App
   - Distribute App → App Store Connect

2. Go to App Store Connect
3. TestFlight → Test with beta users (optional)
4. Select build for submission
5. Add release notes, screenshots, description
6. Submit for Review

**Timeline**: 24-48 hours for review

## 9. Automated CI/CD

GitHub Actions workflows handle:
- ✅ Automatic builds on push to main
- ✅ Artifact storage
- ✅ Automated Play Store deployment (draft)
- ✅ Automated App Store submission (beta)

### Required Secrets

Add to GitHub repository settings:

```
GOOGLE_PLAY_SERVICE_ACCOUNT = <JSON from Google Play API>
APPSTORE_ISSUER_ID = <Your App Store Connect Issuer ID>
APPSTORE_API_KEY_ID = <Your API Key ID>
APPSTORE_API_PRIVATE_KEY = <Your private key>
```

## 10. App Configuration

### App Name & Bundle IDs

**Android:**
- Package: `com.padi.padiplus`
- Min SDK: 21 (Android 5.0)

**iOS:**
- Bundle ID: `com.padi.padiplus`
- Min Version: iOS 12.0

### Update Version

Edit `pubspec.yaml`:
```yaml
version: 1.0.0+1  # version+build_number
```

## 11. Testing Checklist

Before submission:

- [ ] Authentication flows work (signup, login, logout)
- [ ] Supabase sync working
- [ ] All screens render correctly
- [ ] No console errors
- [ ] Performance metrics acceptable
- [ ] Offline mode works
- [ ] Push notifications functional
- [ ] Payment processing works
- [ ] Tested on multiple devices

## 12. Support

For issues:
- Flutter docs: https://flutter.dev/docs
- Supabase docs: https://supabase.com/docs
- Flutter community: https://flutter.dev/community
- GitHub Issues: https://github.com/lakershotels/padi-plug-connect/issues

---

**Last Updated**: August 8, 2026
**Status**: Ready for production builds ✅
