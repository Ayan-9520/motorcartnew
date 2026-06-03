# Motorcart — one-time local setup (Windows + XAMPP)
Write-Host "Motorcart MySQL setup..." -ForegroundColor Green

if (-not (Test-Path "backend\.env")) {
  Copy-Item "backend\.env.example" "backend\.env"
  Write-Host "Created backend/.env" -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env.local")) {
  Copy-Item "frontend\.env.example" "frontend\.env.local"
  Write-Host "Created frontend/.env.local" -ForegroundColor Yellow
}

Write-Host "Installing dependencies..."
npm install
npm run install:all

Push-Location backend
$env:DATABASE_URL = "mysql://root:@localhost:3306/motorcart"
npx prisma generate
npx prisma db push
npm run db:seed
Pop-Location

Write-Host ""
Write-Host "Done! Run: npm run dev" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Login: customer@motorcart.in / Customer@123" -ForegroundColor Cyan
