# One-time Git setup — run once, then normal git commands work in Cursor terminal.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/git-setup-once.ps1

$ErrorActionPreference = "Stop"

$gitCmd = "C:\Program Files\Git\cmd"
$gitBin = "C:\Program Files\Git\bin"
$gitExe = "$gitCmd\git.exe"
$repoRoot = if ((Split-Path -Leaf $PSScriptRoot) -eq "scripts") {
  Split-Path -Parent $PSScriptRoot
} else {
  $PSScriptRoot
}
$safePath = (Resolve-Path $repoRoot).Path.Replace("\", "/")

if (-not (Test-Path $gitExe)) {
  Write-Host "Installing Git..." -ForegroundColor Yellow
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
}

# 1. Permanent PATH (User)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = @()
if ($userPath) { $parts = $userPath -split ';' | Where-Object { $_ -and $_.Trim() -ne '' } }
foreach ($p in @($gitCmd, $gitBin)) {
  if ($parts -notcontains $p) { $parts += $p }
}
[Environment]::SetEnvironmentVariable("Path", ($parts -join ';'), "User")
$env:Path = "$gitCmd;$gitBin;" + $env:Path

# 2. Trust this repo folder (fixes dubious ownership on Windows)
& $gitExe config --global --add safe.directory $safePath 2>$null

# 3. Repo identity (local only)
Set-Location $repoRoot
& $gitExe config --local user.name "Ayan-9520"
& $gitExe config --local user.email "Ayan-9520@users.noreply.github.com"
& $gitExe config --local init.defaultBranch main
& $gitExe remote set-url origin "https://github.com/Ayan-9520/motorcartnew.git"

# 4. Credential helper (Git Credential Manager — browser login on first push)
& $gitExe config --global credential.helper manager

Write-Host ""
Write-Host "=== Git setup complete ===" -ForegroundColor Green
& $gitExe --version
Write-Host "Remote:" -ForegroundColor Cyan
& $gitExe remote -v
Write-Host ""
Write-Host "Ab normal commands chalenge:" -ForegroundColor Green
Write-Host '  git add .'
Write-Host '  git commit -m "code change"'
Write-Host '  git push origin main'
Write-Host ""
Write-Host "Naya terminal kholo (Ctrl+Shift+`) ya Cursor restart karo." -ForegroundColor Yellow
