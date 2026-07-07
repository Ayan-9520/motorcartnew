# Push motorcartcursor -> github.com/Ayan-9520/motorcartnew
# Usage:
#   powershell -ExecutionPolicy Bypass -File E:\Projects\motorcartcursor\scripts\push-motorcartnew.ps1

$ErrorActionPreference = "Stop"

$Root = "E:\Projects\motorcartcursor"
$gitExe = "C:\Program Files\Git\cmd\git.exe"
$safeDir = "E:/Projects/motorcartcursor"
$remoteUrl = "https://github.com/Ayan-9520/motorcartnew.git"

if (-not (Test-Path $gitExe)) {
  Write-Host "Git not installed!" -ForegroundColor Red
  Write-Host "Run: winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements"
  exit 1
}

Set-Location $Root

function MotorGit {
  param([Parameter(Mandatory = $true)][string[]]$GitArguments)
  & $gitExe -c "safe.directory=$safeDir" @GitArguments
  if ($LASTEXITCODE -ne 0) {
    throw "git failed: $($GitArguments -join ' ') (exit $LASTEXITCODE)"
  }
}

Write-Host ""
Write-Host "=== Motorcart GitHub Push ===" -ForegroundColor Cyan
Write-Host "Repo: $remoteUrl" -ForegroundColor Cyan
Write-Host ""

MotorGit @("remote", "set-url", "origin", $remoteUrl)
MotorGit @("remote", "-v")

$statusLines = & $gitExe -c "safe.directory=$safeDir" status --porcelain
if ($statusLines) {
  MotorGit @("add", "-A")
  MotorGit @("commit", "-m", "Motorcart full stack: frontend, backend, Docker")
  Write-Host "Committed changes." -ForegroundColor Green
} else {
  Write-Host "No new files to commit." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "If login asks:" -ForegroundColor Yellow
Write-Host "  Username: Ayan-9520" -ForegroundColor Yellow
Write-Host "  Password: GitHub Personal Access Token (NOT your password)" -ForegroundColor Yellow
Write-Host "  Token: https://github.com/settings/tokens -> Generate -> repo scope" -ForegroundColor Yellow
Write-Host ""

& $gitExe -c "safe.directory=$safeDir" push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "SUCCESS! Open: https://github.com/Ayan-9520/motorcartnew" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "Push failed. Create token at https://github.com/settings/tokens" -ForegroundColor Red
  Write-Host "Select 'repo' checkbox, copy token, paste as password when prompted." -ForegroundColor Red
  exit 1
}
