#!/bin/bash

##############################################################################
# Important: Set this first to tell the script where to install the map files
# Example:
#   INSTALLATION_PATH=~/.local/share/0ad/mods
##############################################################################
#INSTALLATION_PATH=~/.local/share/0ad/mods
INSTALLATION_PATH=~/snap/0ad/current/.local/share/0ad/mods/


##############################################################################
# Server address and file names
##############################################################################
SERVER_HTTP=https://ihaveastream.mywire.org/public/uploads/0ad/mods/
MANIFEST_FILE=mods.txt


##############################################################################
# Sanity check if installation path is set
##############################################################################
if [ -z ${INSTALLATION_PATH+x} ]; then
    echo "INSTALLATION_PATH is unset. Open this file and set file destination.";
    exit 1 ;
fi

##############################################################################
# Download manifest and files to installation path
##############################################################################
MANIFEST_PATH=$(mktemp)
trap 'rm -f "$MANIFEST_PATH"' EXIT

if ! wget -q -O "$MANIFEST_PATH" "$SERVER_HTTP/$MANIFEST_FILE"; then
    echo "Could not download manifest: $SERVER_HTTP/$MANIFEST_FILE"
    exit 1
fi

while IFS= read -r FILE || [ -n "$FILE" ]
do
    case "$FILE" in
        ""|\#*)
            continue
            ;;
    esac

    MOD_NAME=$(basename "$FILE" .zip)
    rm -rf "$INSTALLATION_PATH/$MOD_NAME"
    mkdir -p "$INSTALLATION_PATH/$MOD_NAME"
    wget -P "$INSTALLATION_PATH" -O "$INSTALLATION_PATH/$MOD_NAME/$FILE" "$SERVER_HTTP/$FILE"
done < "$MANIFEST_PATH"

echo "Done. Enjoy."
