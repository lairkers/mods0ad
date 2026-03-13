@echo off

rem #############################################################################
rem  Important: Set this first to tell the script where to install the map files
rem  Example:
rem    set INSTALLATION_PATH=C:\Users\%USERNAME%\Documents\My Games\0ad\mods\
rem #############################################################################
set INSTALLATION_PATH=C:\Users\%USERNAME%\Documents\My Games\0ad\mods


rem #############################################################################
rem  Server address and file names
rem #############################################################################
set SERVER_HTTP=https://ihaveastream.mywire.org/public/uploads/0ad/mods/
set MANIFEST_FILE=mods.txt
set MANIFEST_PATH=%TEMP%\mods0ad_manifest.txt


rem #############################################################################
rem  Sanity check if installation path is set
rem #############################################################################
if "%INSTALLATION_PATH%"=="" (
    echo "INSTALLATION_PATH is unset. Open this file and set file destination."
    exit 1
)

rem #############################################################################
rem  Download manifest and files to installation path
rem #############################################################################
curl -fsSL -o "%MANIFEST_PATH%" "%SERVER_HTTP%%MANIFEST_FILE%"
if errorlevel 1 (
    echo Could not download manifest: %SERVER_HTTP%%MANIFEST_FILE%
    exit /b 1
)

for /f "usebackq eol=# tokens=* delims=" %%f in ("%MANIFEST_PATH%") do (
    if not "%%f"=="" (
        rmdir /s /q "%INSTALLATION_PATH%\%%~nf"
        mkdir "%INSTALLATION_PATH%\%%~nf"
        call curl --create-dirs -o "%INSTALLATION_PATH%\%%~nf\%%f" "%SERVER_HTTP%%%f"
    )
)

del /q "%MANIFEST_PATH%"

echo Done. Enjoy.

pause
