# PadiPlug Android Build Script (PowerShell)
# Builds APK and AAB for Android deployment
# Usage: .\build-android.ps1

param(
    [switch]$DebugBuild = $false,
    [switch]$APKOnly = $false,
    [switch]$AABOnly = $false
)

# Color functions
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Step { Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $args" -ForegroundColor Yellow }

# Banner
Write-Host ""
Write-Host "========================================"
Write-Host "   PadiPlug Android Build Script"
Write-Host "========================================"
Write-Host ""

# Check Flutter
try {
    $flutterVersion = flutter --version 2>&1 | Select-Object -First 1
    Write-Success "✓ Flutter found: $flutterVersion"
} catch {
    Write-Error "✗ Flutter not found. Install Flutter first: https://flutter.dev/docs/get-started/install"
    exit 1
}

# Setup
$buildTime = (Get-Date).ToString("yyyyMMdd_HHmmss")
$outputDir = Join-Path (Get-Location) "build-output\$buildTime"
$buildType = if ($DebugBuild) { "debug" } else { "release" }

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Write-Info "Output directory: $outputDir"

Push-Location flutter-app

try {
    # Clean
    Write-Step "Cleaning previous builds..."
    flutter clean | Out-Null
    flutter pub get | Out-Null
    
    # Build APK
    if (-not $AABOnly) {
        Write-Step "Building $buildType APK (this may take 10-30 minutes)..."
        Write-Host ""
        
        if ($DebugBuild) {
            flutter build apk --debug
        } else {
            flutter build apk --release
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "✗ APK build failed"
            exit 1
        }
        
        $apkPath = "build\app\outputs\flutter-apk\app-$buildType.apk"
        $apkOutput = Join-Path $outputDir "padiplug-$buildTime.apk"
        Copy-Item $apkPath $apkOutput
        Write-Success "✓ APK saved: $apkOutput"
    }
    
    # Build AAB (only for release)
    if (-not $APKOnly -and -not $DebugBuild) {
        Write-Step "Building AAB for Play Store..."
        Write-Host ""
        
        flutter build appbundle --release
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "✗ AAB build failed"
            exit 1
        }
        
        $aabPath = "build\app\outputs\bundle\release\app-release.aab"
        $aabOutput = Join-Path $outputDir "padiplug-$buildTime.aab"
        Copy-Item $aabPath $aabOutput
        Write-Success "✓ AAB saved: $aabOutput"
    }
    
} finally {
    Pop-Location
}

# Summary
Write-Host ""
Write-Host "========================================"
Write-Success "   BUILD COMPLETE!"
Write-Host "========================================"
Write-Host ""

if (Test-Path (Join-Path $outputDir "*-$buildTime.apk")) {
    Write-Success "✓ APK ready for installation/testing"
}
if (Test-Path (Join-Path $outputDir "*-$buildTime.aab")) {
    Write-Success "✓ AAB ready for Play Store upload"
}

Write-Host ""
Write-Info "Build artifacts:"
Get-ChildItem $outputDir | ForEach-Object {
    Write-Host "  - $($_.FullName)"
}

Write-Host ""
Write-Info "Next steps:"
Write-Host "  1. Upload AAB to Google Play Console"
Write-Host "  2. Test APK on Android device: flutter install $apkOutput"
Write-Host "  3. Submit for review"
Write-Host ""

# Open output folder in Explorer
Write-Host "Opening build output folder..."
Invoke-Item $outputDir
