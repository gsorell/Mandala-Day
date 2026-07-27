@echo off
REM ---------------------------------------------------------------------------
REM Mandala Day Visual Engine - one-click launcher.
REM
REM Double-click this file and type a preset name (e.g. geometry_of_attention),
REM or run from a terminal:   render.bat geometry_of_attention --preview
REM Any extra flags after the name are passed straight through to render.py.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

set "PRESET=%~1"
if "%PRESET%"=="" set /p PRESET="Preset name (e.g. geometry_of_attention): "
if "%PRESET%"=="" (
    echo No preset given. Exiting.
    pause
    exit /b 1
)

".venv\Scripts\python.exe" render.py %*

echo.
echo Done. Output is in the 'output' folder.
pause
