# Fix: git command not recognized (Windows)
# Run once after installing Git, then RESTART terminal / Cursor.

$gitCmd = "C:\Program Files\Git\cmd"
$gitBin = "C:\Program Files\Git\bin"

if (-not (Test-Path "$gitCmd\git.exe")) {
  Write-Host "Git not installed. Run:" -ForegroundColor Red
  Write-Host '  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements'
  exit 1
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = @()
if ($userPath) { $parts = $userPath -split ';' | Where-Object { $_ -and $_.Trim() -ne '' } }

foreach ($p in @($gitCmd, $gitBin)) {
  if ($parts -notcontains $p) { $parts += $p }
}

[Environment]::SetEnvironmentVariable("Path", ($parts -join ';'), "User")
$env:Path = "$gitCmd;$gitBin;" + $env:Path

Write-Host "Git PATH fixed." -ForegroundColor Green
& "$gitCmd\git.exe" --version

$repoRoot = Split-Path -Parent $PSScriptRoot
if ((Split-Path -Leaf $PSScriptRoot) -ne "scripts") { $repoRoot = $PSScriptRoot }
$safePath = (Resolve-Path $repoRoot -ErrorAction SilentlyContinue).Path.Replace("\", "/")
if ($safePath -and (Test-Path "$repoRoot\.git")) {
  & "$gitCmd\git.exe" -c "safe.directory=$safePath" config --local safe.directory $safePath 2>$null
  Write-Host "Repo safe.directory set for: $safePath" -ForegroundColor Green
}

Write-Host ""
Write-Host "IMPORTANT: Close this terminal and open a NEW one (or restart Cursor)." -ForegroundColor Yellow
Write-Host "Then run: git --version"
