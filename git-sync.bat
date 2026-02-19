@echo off
set /p msg="Digite a mensagem do commit (ou aperte Enter para 'update'): "
if "%msg%"=="" set msg=update

echo === Puxando atualizacoes... ===
git pull origin main

echo === Adicionando arquivos... ===
git add .

echo === Commitando... ===
git commit -m "%msg%"

echo === Subindo para o GitHub... ===
git push origin main

echo === Concluido! ===
pause
