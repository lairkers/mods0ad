#!/bin/bash

##############################################################################
# Important: Set this first to tell the script where to install the map files
# Example:
#   INSTALLATION_PATH=~/.local/share/0ad/mods
##############################################################################
INSTALLATION_PATH=~/.local/share/0ad/mods


##############################################################################
# Server address and file names
##############################################################################
SERVER_HTTP=https://ihaveastream.mywire.org/public/uploads/0ad/mods/
FILES=(jebel_barkal_extreme.zip petra_lag_fix.zip)


##############################################################################
# Sanity check if installation path is set
##############################################################################
if [ -z ${INSTALLATION_PATH+x} ]; then
    echo "INSTALLATION_PATH is unset. Open this file and set file destination.";
    exit 1 ;
fi

##############################################################################
# Download files to installation path
##############################################################################
for FILE in "${FILES[@]}"
do
    mkdir -p $INSTALLATION_PATH/$(basename $FILE .zip)
    wget -P $INSTALLATION_PATH -O $INSTALLATION_PATH/$(basename $FILE .zip)/$FILE $SERVER_HTTP/$FILE
done

echo "Done. Enjoy."