# Motorcart — one-time local setup (PostgreSQL + Redis via Docker)
Write-Host "Motorcart PostgreSQL setup..." -ForegroundColor Green

if (-not (Test-Path "backend\.env")) {
  Copy-Item "backend\.env.example" "backend\.env"
  Write-Host "Created backend/.env" -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env.local")) {
  Copy-Item "frontend\.env.example" "frontend\.env.local"
  Write-Host "Created frontend/.env.local" -ForegroundColor Yellow
}

if (-not (Test-Path ".env.docker")) {
  Copy-Item ".env.docker.example" ".env.docker"
  Write-Host "Created .env.docker" -ForegroundColor Yellow
}

Write-Host "Starting PostgreSQL + Redis (Docker)..."
docker compose up postgres redis -d

Write-Host "Installing dependencies..."
npm install
npm run install:all

Write-Host "Waiting for PostgreSQL..."
Start-Sleep -Seconds 5

Push-Location backend
npx prisma generate
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  Write-Host "migrate deploy failed — trying db push..." -ForegroundColor Yellow
  npx prisma db push
}
npm run db:seed
Pop-Location

Write-Host ""
Write-Host "Done! Run: npm run dev" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001/api/health" -ForegroundColor Cyan
Write-Host "Login: customer@motorcart.in / Customer@123" -ForegroundColor Cyan
