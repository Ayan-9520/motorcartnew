# Motorcart - Git + GitHub push setup (run from repo root)
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1 -Push
#   powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1 -RemoteUrl "https://github.com/YOU/motorcart.git" -Push

param(
  [string]$RemoteUrl = "",
  [string]$Branch = "main",
  [switch]$Push,
  [switch]$InitOnly
)

$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
if ((Split-Path -Leaf $Root) -eq "scripts") { $Root = Split-Path -Parent $Root }
Set-Location $Root

function Find-Git {
  $candidates = @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  return "git"
}

$git = Find-Git
$safePath = (Resolve-Path $Root).Path.Replace("\", "/")

function Invoke-Git {
  param(
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArguments,
    [switch]$AllowFailure
  )
  & $git -c "safe.directory=$safePath" @GitArguments
  if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
    throw "git $($GitArguments -join ' ') failed (exit $LASTEXITCODE)"
  }
  return $LASTEXITCODE
}

Write-Host "Using Git: $git" -ForegroundColor Cyan
Invoke-Git --version

if (-not (Test-Path ".git")) {
  Write-Host "Initializing new git repository..." -ForegroundColor Yellow
  Invoke-Git init -b $Branch
}

try {
  Invoke-Git config --local safe.directory $safePath
} catch {
  Write-Host "Note: using -c safe.directory for this session." -ForegroundColor Yellow
}

$name = & $git -c "safe.directory=$safePath" config --local user.name 2>$null
$email = & $git -c "safe.directory=$safePath" config --local user.email 2>$null
if (-not $name -or -not $email) {
  Write-Host ""
  Write-Host "Git identity not set for this repo." -ForegroundColor Yellow
  Write-Host '  git config --local user.name "Your Name"' -ForegroundColor Cyan
  Write-Host '  git config --local user.email "you@example.com"' -ForegroundColor Cyan
  Write-Host ""
}

if ($RemoteUrl) {
  $existing = ""
  Invoke-Git remote get-url origin -AllowFailure | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $existing = & $git -c "safe.directory=$safePath" remote get-url origin
  }
  if (-not $existing) {
    Invoke-Git remote add origin $RemoteUrl
    Write-Host "Added remote origin: $RemoteUrl" -ForegroundColor Green
  } else {
    Invoke-Git remote set-url origin $RemoteUrl
    Write-Host "Updated remote origin: $RemoteUrl (was: $existing)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Remote:" -ForegroundColor Cyan
Invoke-Git remote -v
Write-Host ""
Write-Host "Branch:" -ForegroundColor Cyan
Invoke-Git branch --show-current
Write-Host ""

if ($InitOnly) {
  Write-Host "Init only - done." -ForegroundColor Green
  exit 0
}

$secretFiles = @(".env", ".env.docker", ".env.local", "backend/.env", "frontend/.env")
foreach ($f in $secretFiles) {
  if (Test-Path $f) {
    Write-Host "WARNING: $f exists locally (gitignored, will NOT be pushed)" -ForegroundColor Yellow
  }
}

Write-Host "Staging all files..." -ForegroundColor Cyan
Invoke-Git add -A
$status = Invoke-Git status --porcelain
if (-not $status) {
  Write-Host "Nothing to commit - working tree clean." -ForegroundColor Green
} else {
  $msg = "Full stack: Docker, API timeouts, frontend fallbacks, PostgreSQL migrations"
  Invoke-Git commit -m $msg
  Write-Host "Commit created." -ForegroundColor Green
}

if ($Push) {
  Write-Host "Pushing to origin/$Branch ..." -ForegroundColor Cyan
  try {
    Invoke-Git push -u origin $Branch
    Write-Host "Push successful!" -ForegroundColor Green
  } catch {
    Write-Host ""
    Write-Host "Push failed - usually GitHub login or PAT required." -ForegroundColor Red
    Write-Host "See GITHUB_SETUP.md for Personal Access Token steps." -ForegroundColor Yellow
    exit 1
  }
} else {
  Write-Host ""
  Write-Host "Next: push to GitHub" -ForegroundColor Green
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1 -Push"
  Write-Host ""
  Write-Host "Or manually:" -ForegroundColor Green
  Write-Host "  git -c safe.directory=$safePath push -u origin $Branch"
}
