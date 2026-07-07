# Motorcart git wrapper - use when plain "git" shows dubious ownership error
# Usage: .\scripts\git.ps1 status
#        .\scripts\git.ps1 push -u origin main

param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$GitArgs
)

$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) { $git = "git" }

$root = Split-Path -Parent $PSScriptRoot
$safe = (Resolve-Path $root).Path.Replace("\", "/")

& $git -c "safe.directory=$safe" @GitArgs
