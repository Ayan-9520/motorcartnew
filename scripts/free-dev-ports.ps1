# Free ports 3000 (frontend) and 3001 (backend) before npm run dev
param([int[]]$Ports = @(3000, 3001))

foreach ($port in $Ports) {
  $lines = netstat -ano | Select-String ":$port\s"
  $pids = @()
  foreach ($line in $lines) {
    if ($line -match 'LISTENING\s+(\d+)\s*$') {
      $pids += [int]$Matches[1]
    }
  }
  foreach ($procId in ($pids | Select-Object -Unique)) {
    if ($procId -le 4) { continue }
    Write-Host "Stopping PID $procId on port $port" -ForegroundColor Yellow
    taskkill /PID $procId /F 2>$null | Out-Null
  }
}

Start-Sleep -Seconds 1
Write-Host "Ports 3000 and 3001 cleared." -ForegroundColor Green
