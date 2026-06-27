@echo off
title Stockfish Helper Server
echo ===================================================
echo   Starting Stockfish Chess Helper Local Server
echo ===================================================
echo.

:: Check if server.py is in the current script folder
if exist "%~dp0server.py" (
    cd /d "%~dp0"
    python server.py
    goto end
)

:: Check if server.py is in the stockfish subdirectory
if exist "%~dp0stockfish\server.py" (
    cd /d "%~dp0stockfish"
    python server.py
    goto end
)

echo [ERROR] server.py could not be found.
echo Checked folders:
echo   - %~dp0
echo   - %~dp0stockfish
echo.
pause
exit /b

:end
pause
