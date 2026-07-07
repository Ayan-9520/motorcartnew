@echo off
title Motorcart -> GitHub Push
cd /d "%~dp0"
echo.
echo === Motorcart GitHub Push (motorcartnew) ===
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\push-motorcartnew.ps1"
echo.
pause
