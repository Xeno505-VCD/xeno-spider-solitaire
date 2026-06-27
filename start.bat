@echo off
echo ============================================
echo   XENO·异星织网者 - 蜘蛛纸牌 开发服务器
echo ============================================
echo.

cd /d "%~dp0"
echo 当前目录: %cd%
echo.

echo 正在安装依赖...
call npm install --silent 2>nul

echo.
echo 启动 Vite 开发服务器...
echo 请在浏览器中打开: http://localhost:5173
echo 按 Ctrl+C 停止服务器
echo.

call npx vite --host

pause