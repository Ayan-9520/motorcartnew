# Coding-side Play Store readiness check (no Expo login required)
# Usage: powershell -ExecutionPolicy Bypass -File .\verify-play-ready.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$fail = 0

function Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Bad($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red; $script:fail++ }

Write-Host "== Motorcart Play coding readiness ==" -ForegroundColor Cyan
Write-Host ""

# Identity
$app = Get-Content .\app.json -Raw | ConvertFrom-Json
if ($app.expo.android.package -eq "in.motorcart.app") { Ok "package in.motorcart.app" } else { Bad "android.package must be in.motorcart.app" }
if ($app.expo.version) { Ok "version $($app.expo.version)" } else { Bad "expo.version missing" }
if ($app.expo.android.versionCode -ge 1) { Ok "versionCode $($app.expo.android.versionCode)" } else { Bad "versionCode missing" }

# EAS profiles
$eas = Get-Content .\eas.json -Raw | ConvertFrom-Json
if ($eas.build.production.android.buildType -eq "app-bundle") { Ok "production buildType = app-bundle (AAB)" } else { Bad "production must use app-bundle" }
if ($eas.build.production.env.EXPO_PUBLIC_API_URL -eq "https://motorcart.in") { Ok "production API = https://motorcart.in" } else { Bad "production EXPO_PUBLIC_API_URL" }
if ($eas.build.production.env.EXPO_PUBLIC_SHOW_DEMO -eq "0") { Ok "demo logins off in production" } else { Bad "demo must be off for Play" }

# Assets
@(
  "assets/icon.png",
  "assets/splash-icon.png",
  "assets/android-icon-foreground.png",
  "assets/android-icon-background.png",
  "store/icon-512.png",
  "store/feature-graphic.png",
  "store/LISTING.md"
) | ForEach-Object {
  if (Test-Path $_) { Ok $_ } else { Bad "missing $_" }
}

# Secrets not committed
if (Test-Path .\google-play-service-account.json) {
  Write-Host "  WARN google-play-service-account.json present locally (ok if gitignored)" -ForegroundColor Yellow
}

# Typecheck
Write-Host ""
Write-Host "Running typecheck..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { Bad "typecheck failed" } else { Ok "typecheck passed" }

Write-Host ""
if ($fail -gt 0) {
  Write-Host "FAILED: $fail check(s). Fix before eas build." -ForegroundColor Red
  exit 1
}

Write-Host "CODING SIDE READY for Play Store build." -ForegroundColor Green
Write-Host ""
Write-Host "Your remaining steps (accounts only):"
Write-Host "  1) Play Console `$25 + create app in.motorcart.app"
Write-Host "  2) npx eas login && npx eas init   (commit projectId)"
Write-Host "  3) npx eas build -p android --profile production"
Write-Host "  4) Upload AAB to Internal testing → then Production"
Write-Host "  Or run:  powershell -ExecutionPolicy Bypass -File .\play-store-build.ps1"
exit 0
