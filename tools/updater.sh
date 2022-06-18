#!/bin/bash

##############################################################################
# Important: Set this first to tell the script where to install the map files
# Example:
#   INSTALLATION_PATH=/home/lars/.local/share/0ad/mods/user/maps
##############################################################################
INSTALLATION_PATH=/home/lars/.local/share/0ad/mods/user/maps


##############################################################################
# Server address and file names
##############################################################################
SERVER_HTTP=http://elgee.bplaced.net/maps0ad/maps/
FILES=(jebel_barkal_2.js jebel_barkal_2.json jebel_barkal_2.pmp jebel_barkal_2_triggers.js)


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
    wget -P $INSTALLATION_PATH $SERVER_HTTP/$FILE
done

echo "Done. Enjoy."