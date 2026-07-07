# Refresh PATH in current terminal (no restart needed)
$gitCmd = "C:\Program Files\Git\cmd"
$gitBin = "C:\Program Files\Git\bin"

$machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
$user = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machine;$user"

if (Test-Path "$gitCmd\git.exe") {
  Write-Host "Git OK:" -ForegroundColor Green -NoNewline
  & "$gitCmd\git.exe" --version
} else {
  Write-Host "Git not installed. Run: winget install --id Git.Git -e" -ForegroundColor Red
}

$root = Split-Path -Parent $PSScriptRoot
if ((Split-Path -Leaf $PSScriptRoot) -ne "scripts") { $root = $PSScriptRoot }
$safe = (Resolve-Path $root -ErrorAction SilentlyContinue).Path.Replace("\", "/")
if ($safe -and (Test-Path "$root\.git")) {
  & "$gitCmd\git.exe" -c "safe.directory=$safe" config --local safe.directory $safe 2>$null
}

Write-Host ""
Write-Host "Ab try karo: git --version" -ForegroundColor Cyan
Write-Host "Push: git push -u origin main" -ForegroundColor Cyan
