# Motorcart — production server deploy (Windows / local prod test)
param(
  [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path $EnvFile)) {
  Write-Host "Missing $EnvFile — copy .env.production.example and edit secrets + domain." -ForegroundColor Red
  exit 1
}

Write-Host "Building and starting production stack..." -ForegroundColor Green
docker compose --env-file $EnvFile -f docker-compose.yml -f docker-compose.prod.yml up -d --build

Write-Host "Waiting for health..." -ForegroundColor Yellow
$ok = $false
for ($i = 0; $i -lt 24; $i++) {
  try {
    $port = (Get-Content $EnvFile | Where-Object { $_ -match '^NGINX_PORT=' } | ForEach-Object { $_ -replace 'NGINX_PORT=', '' })
    if (-not $port) { $port = "80" }
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch { Start-Sleep -Seconds 5 }
}

if ($ok) {
  Write-Host "Stack healthy at http://127.0.0.1:$port/api/health" -ForegroundColor Green
} else {
  Write-Host "Health check timed out — run: docker compose logs backend nginx" -ForegroundColor Yellow
}

Write-Host "Admin login: admin@motorcart.in / Admin@12345 (change in production)" -ForegroundColor Cyan
