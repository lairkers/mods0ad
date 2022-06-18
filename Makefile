# Tools
PYTHON          := python3
RELEASE_SERVER  := elgee.bplaced.net

CP              := cp -f
RM              := rm -rf
MKDIR           := mkdir -p


# Include personal config and paths
include perssettings/$(USER).mk


# Paths
MAPS_ROOT := maps

MAP_ALL_FILES 			:= $(wildcard $(MAPS_ROOT)/$(MAP_TYPE)/$(MAP_NAME)*)
MAP_ALL_FILES_INSTALLED := $(addprefix $(MAP_INSTALL_PATH)/$(MAP_TYPE)/,$(notdir $(MAP_ALL_FILES)))

TEST_ROOT := _log
TEST_LOG  := $(TEST_ROOT)/log.html

TOOLS_ROOT := tools
PUSH2FTP   := $(TOOLS_ROOT)/pushToFtp.py

RELEASE_SERVER_ROOT := /www/maps0ad
RELEASE_SERVER_MAPS := $(RELEASE_SERVER_ROOT)/maps

# Flags
0AD_FLAGS   := -autostart=$(MAP_TYPE)/$(MAP_NAME) -autostart-size=256 -autostart-disable-replay
0AD_VICTORY := -autostart-player=2 -autostart-team=1:1 -autostart-team=2:1


# Installation
$(MAP_INSTALL_PATH)/$(MAP_TYPE):
	$(MKDIR) $@

$(MAP_INSTALL_PATH)/$(MAP_TYPE)/%: $(MAPS_ROOT)/$(MAP_TYPE)/% | $(MAP_INSTALL_PATH)/$(MAP_TYPE)
	$(CP) $< $@

install: $(MAP_ALL_FILES_INSTALLED)


# Testing the map generation
$(TEST_ROOT):
	$(MKDIR) $@

$(TEST_LOG): $(MAP_ALL_FILES_INSTALLED)
	$(0AD) $(0AD_FLAGS) $(0AD_VICTORY) -autostart-nonvisual -quickstart || true
	$(CP) $(0AD_LOG) $@

testlog: $(TEST_LOG)


# Unreveal map (there was no autostart-uncover)
view: $(MAP_ALL_FILES_INSTALLED)
	$(0AD) $(0AD_FLAGS) $(0AD_VICTORY)


# Playing (and checking if map actually looks correct)
play: $(MAP_ALL_FILES_INSTALLED)
	$(0AD) $(0AD_FLAGS)


# Upload to FTP server
release:
	$(PYTHON) $(PUSH2FTP) --server $(RELEASE_SERVER) --user $(RELEASE_SERVER_USER) \
        --password $(RELEASE_SERVER_PWD) --path $(RELEASE_SERVER_MAPS) --file $(MAP_ALL_FILES)


# Cleanup
clean:
	$(RM) $(TEST_ROOT)