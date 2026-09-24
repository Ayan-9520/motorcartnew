# Motorcart — remaining Play Store steps (run on your PC after Expo account login)
# Usage: powershell -ExecutionPolicy Bypass -File .\play-store-build.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Motorcart Play Store build ==" -ForegroundColor Green
Write-Host "Package: in.motorcart.app"
Write-Host "API: https://motorcart.in"
Write-Host ""

Write-Host "0) Coding readiness check..."
powershell -ExecutionPolicy Bypass -File .\verify-play-ready.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
  Write-Host "Installing eas-cli globally..."
  npm install -g eas-cli
}

Write-Host "1) Expo login (browser)..."
eas login

Write-Host "2) Link EAS project (writes projectId into app.json — commit that line after)..."
eas init

Write-Host "3) Production AAB build..."
eas build -p android --profile production

Write-Host ""
Write-Host "Done. Download AAB from Expo dashboard → upload in Play Console Internal track." -ForegroundColor Green
Write-Host "Listing assets: .\store\  |  Copy: .\store\LISTING.md"
Write-Host "Privacy URL: https://motorcart.in/privacy"
Write-Host "After first signed build: paste SHA-256 into frontend/public/.well-known/assetlinks.json"
