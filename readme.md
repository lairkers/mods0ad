# Maps for 0.A.D.

## Purpose

The purpose of this repo is to develop custom maps for 0.A.D. (see https://wildfiregames.com/).

## Structure

- maps/random:
    Contains the files for the maps. Currently only an extension for Jebel Barkal map is supported.
- perssettings:
    Contains the personal development environment.
- tools:
    Contains tools, e.g. for syncing the map with other players after modding continued.

## Usage

Step 1: Adapt the code. Example: jebel_barkal_2.js contains the code to create the map,
jebel_barkal_2_trigger.js contains the code which is executed _during_ the game.
The language is javascript, thus the extension '.js'.

Step 2: Test the code. You may choose:
'make install' - copies the map into the correct game directory. Then start 0.A.D. by hand and choose the map.
'make testlog' - installs the map and does a quick creation test, creates the _log/log.html file.
'make view' - installs the map and starts 0.A.D. in autoplay with uncovered map, so that you can verify
whether generation is correct. A standard size is chosen.
'make play' - installs the map and starts 0.A.D. to play. This is used for checking if triggers are
correctly implemented.

Step 3: Commit changes if tests are passing. Use 'svn ci -m "commit message"'. This is only important
For keeping track of changes and reversing if something was a bad decision.

Step 4: Release by typing 'make release'. This uploads the files to a server. Your friends (and you)
may use the tools/updater.(bat/sh) for a one-click map sync after a new version was released.
