@echo off

rem #############################################################################
rem  Important: Set this first to tell the script where to install the map files
rem  Example:
rem    set INSTALLATION_PATH=C:\Users\%USERNAME%\Documents\My Games\0ad\mods\user\maps\random\
rem #############################################################################
set INSTALLATION_PATH=C:\Users\%USERNAME%\Documents\My Games\0ad\mods\user\maps\random\


rem #############################################################################
rem  Server address and file names
rem #############################################################################
set SERVER_HTTP=http://elgee.bplaced.net/maps0ad/maps/
set FILES=jebel_barkal_2.js jebel_barkal_2.json jebel_barkal_2.pmp jebel_barkal_2_triggers.js


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
    call curl --create-dirs -o "%INSTALLATION_PATH%%%f" "%SERVER_HTTP%%%f"
)

echo Done. Enjoy.