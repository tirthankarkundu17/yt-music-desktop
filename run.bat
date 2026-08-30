@echo off
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
cd /d "%~dp0src-tauri"
echo Starting YouTube Music (Tauri Rust Client)...
cargo run
pause
