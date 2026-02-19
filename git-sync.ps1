$msg = Read-Host "Digite a mensagem do commit (ou aperte Enter para 'update')"
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "update" }

Write-Host "`n=== Puxando atualizacoes... ===" -ForegroundColor Cyan
git pull origin main

Write-Host "`n=== Adicionando arquivos... ===" -ForegroundColor Cyan
git add .

Write-Host "`n=== Commitando... ===" -ForegroundColor Cyan
git commit -m "$msg"

Write-Host "`n=== Subindo para o GitHub... ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Concluido! ===" -ForegroundColor Green
pause
