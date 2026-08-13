#!/bin/bash

# Flutter Build Script for Android (APK & AAB) and iOS

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== PadiPlug Flutter Build Script ===${NC}\n"

# Check Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}Flutter is not installed. Install Flutter and try again.${NC}"
    exit 1
fi

# Get Flutter version
flutter --version

# Navigate to flutter directory
cd flutter || exit 1

# Get dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
flutter pub get

# Analyze code
echo -e "${YELLOW}Analyzing code...${NC}"
flutter analyze --no-fatal-infos || true

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
flutter test --coverage || true

# Build for Android
echo -e "${YELLOW}Building Android APK...${NC}"
flutter build apk \
    --release \
    --target-platform android-arm64 \
    --split-per-abi \
    --obfuscate \
    --split-debug-info=build/app/intermediates/symbols

echo -e "${GREEN}✓ APK built: build/app/outputs/flutter-apk/app-arm64-v8a-release.apk${NC}"

# Build for Android App Bundle (AAB) - for Play Store
echo -e "${YELLOW}Building Android App Bundle (AAB) for Play Store...${NC}"
flutter build appbundle \
    --release \
    --obfuscate \
    --split-debug-info=build/app/intermediates/symbols

echo -e "${GREEN}✓ AAB built: build/app/outputs/bundle/release/app-release.aab${NC}"

# Build for iOS
echo -e "${YELLOW}Building iOS app...${NC}"
flutter build ios \
    --release \
    --obfuscate \
    --split-debug-info=build/ios/intermediates/symbols

echo -e "${GREEN}✓ iOS app built${NC}"

# Summary
echo -e "\n${GREEN}=== Build Complete ===${NC}"
echo -e "${YELLOW}Artifacts:${NC}"
echo "- Android APK: build/app/outputs/flutter-apk/app-arm64-v8a-release.apk"
echo "- Android AAB: build/app/outputs/bundle/release/app-release.aab"
echo "- iOS: build/ios/iphoneos/Runner.app"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Upload AAB to Google Play Console"
echo "2. Archive iOS app in Xcode for App Store submission"
echo "3. Submit to Apple App Store"
