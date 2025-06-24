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
set FILES=jebel_barkal_extreme.zip petra_lag_fix.zip


rem #############################################################################
rem  Sanity check if installation path is set
rem #############################################################################
if "%INSTALLATION_PATH%"=="" (
    echo "INSTALLATION_PATH is unset. Open this file and set file destination."
    exit 1
)

rem #############################################################################
rem  Download files to installation path
rem #############################################################################
for %%f in (%FILES%) do (
    mkdir -p $INSTALLATION_PATH/%%~nf
    call curl --create-dirs -o "%INSTALLATION_PATH%\%%~nf\%%f" "%SERVER_HTTP%%%f"
)

echo Done. Enjoy.