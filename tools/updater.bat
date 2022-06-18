rem #############################################################################
rem  Important: Set this first to tell the script where to install the map files
rem  Example:
rem    set /A INSTALLATION_PATH=    \todo: set an example here and test the script on windows
rem #############################################################################
set /A INSTALLATION_PATH=


rem #############################################################################
rem  Server address and file names
rem #############################################################################
set /A SERVER_HTTP=http://elgee.bplaced.net/maps0ad/maps/
set /A FILES[0]=jebel_barkal_2.js
set /A FILES[1]=jebel_barkal_2.json
set /A FILES[2]=jebel_barkal_2.pmp 
set /A FILEs[3]=jebel_barkal_2_triggers.js


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
for /L %%i in (0 1 3) do (
    call curl -P %SERVER_HTTP%/%%FILES[%%i]%% -o %INSTALLATION_PATH%/%%FILES[%%i]%%
)

echo "Done. Enjoy."