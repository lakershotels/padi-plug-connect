@echo off
REM PadiPlug Android Build Script
REM Builds APK and AAB for Android deployment

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   PadiPlug Android Build Script
echo ========================================
echo.

REM Check Flutter is installed
flutter --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Flutter not found. Please install Flutter first.
    exit /b 1
)

cd flutter-app

REM Create output directory
set "BUILD_TIME=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BUILD_TIME=%BUILD_TIME: =0%"
set "OUTPUT_DIR=..\build-output\%BUILD_TIME%"
mkdir %OUTPUT_DIR% 2>nul

echo.
echo [1/3] Cleaning previous builds...
call flutter clean >nul 2>&1
call flutter pub get >nul 2>&1

echo.
echo [2/3] Building Release APK...
echo This may take 10-30 minutes on first run.
call flutter build apk --release

if errorlevel 1 (
    echo ERROR: APK build failed!
    exit /b 1
)

echo.
echo [3/3] Building Release AAB...
call flutter build appbundle --release

if errorlevel 1 (
    echo ERROR: AAB build failed!
    exit /b 1
)

REM Copy outputs
echo.
echo Copying build artifacts...
copy build\app\outputs\flutter-apk\app-release.apk %OUTPUT_DIR%\padiplug-%BUILD_TIME%.apk >nul
copy build\app\outputs\bundle\release\app-release.aab %OUTPUT_DIR%\padiplug-%BUILD_TIME%.aab >nul

echo.
echo ========================================
echo   BUILD COMPLETE!
echo ========================================
echo.
echo APK:  %OUTPUT_DIR%\padiplug-%BUILD_TIME%.apk
echo AAB:  %OUTPUT_DIR%\padiplug-%BUILD_TIME%.aab
echo.
echo Next steps:
echo 1. Upload AAB to Google Play Console
echo 2. Test APK on Android device
echo 3. Submit for review
echo.

pause
