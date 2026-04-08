Write-Host "Pulizia cache Next.js..." -ForegroundColor Cyan
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "Pulizia cache node_modules..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

Write-Host "Avvio dev server..." -ForegroundColor Green
npm run dev
