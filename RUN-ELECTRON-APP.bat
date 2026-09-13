@echo off
title Embroidery Visualizer & Mockup Studio - Raven Labs
cd /d "%~dp0"
echo ========================================================
echo   Starting Embroidery Visualizer & Mockup Studio
echo                 by Raven Labs
echo ========================================================
echo.
npm run electron:dev
pause
