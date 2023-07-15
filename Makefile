# Tools
PYTHON          := python3
ZIP             := 7z

CP              := cp -f
RM              := rm -rf
MKDIR           := mkdir -p


# Include personal config and paths
include perssettings/$(USER).mk

.SECONDEXPANSION:

# Paths
MOD_ROOT        := mods
MOD_DIR         := $(MOD_ROOT)/$(MOD_NAME)
MOD_ALL         := $(wildcard $(MOD_ROOT)/*)
MOD_ALL_NAMES   := $(notdir $(MOD_ALL))

ZIP_DIR            := _zip
MOD_ZIPPED         := $(ZIP_DIR)/$(MOD_NAME).zip
MOD_ALL_ZIPPED     := $(addsuffix .zip,$(addprefix $(ZIP_DIR)/,$(notdir $(MOD_ALL))))
MOD_INSTALLED      := $(MOD_INSTALL_DIR)/$(MOD_NAME)/$(MOD_NAME).zip
MOD_ALL_INSTALLED  := $(addprefix $(MOD_INSTALL_DIR)/,$(join $(addsuffix /,$(MOD_ALL_NAMES)),$(addsuffix .zip,$(MOD_ALL_NAMES))))

TEST_ROOT := _log
TEST_DIR  := $(TEST_ROOT)/$(MOD_NAME)
TEST_LOG  := $(TEST_DIR)/log.html

TOOLS_ROOT   := tools
PUSH2FTP     := $(TOOLS_ROOT)/pushToFtp.py
UPDATER_WIN  := $(TOOLS_ROOT)/updater.bat
UPDATER_UNIX := $(TOOLS_ROOT)/updater.sh

RELEASE_SERVER_FTP  := elgee.bplaced.net
RELEASE_SERVER_ROOT := /www
RELEASE_SERVER_DIR  := mods0ad/mods
RELEASE_SERVER_MODS := $(RELEASE_SERVER_ROOT)/$(RELEASE_SERVER_DIR)

# TODO: how to autostart with MODs / a certain map if MOD is map?
# Flags
0AD_FLAGS   := -autostart=random/$(MAP_NAME) -autostart-size=256 -autostart-disable-replay
0AD_VICTORY := -autostart-player=2 -autostart-team=1:1 -autostart-team=2:1


# Creation of Zip
$(ZIP_DIR):
	$(MKDIR) $@

$(ZIP_DIR)/%: $(shell find $(MOD_DIR)/$(%) -type f) | $(ZIP_DIR)
	$(ZIP) a -r -tzip $@ ./$(MOD_ROOT)/$(notdir $(@:.zip=))/*

zip: $(MOD_ZIPPED)
zipall: $(MOD_ALL_ZIPPED)

# Installation - TODO: Check if mod.json should be deleted here
$(MOD_INSTALL_DIR)/%: $(ZIP_DIR)/$$(notdir $$@)
	$(MKDIR) $(@D) && $(CP) $< $@

install: $(MOD_INSTALLED)
installall: $(MOD_ALL_INSTALLED)


# Testing the map generation
$(TEST_ROOT):
	$(MKDIR) $@

$(TEST_LOG): $(MOD_INSTALLED)
	$(0AD) $(0AD_FLAGS) $(0AD_VICTORY) -autostart-nonvisual -quickstart || true
	$(CP) $(0AD_LOG) $@

testlog: $(TEST_LOG)


# Unreveal map (there was no autostart-uncover)
view: $(MOD_INSTALLED)
	$(0AD) $(0AD_FLAGS) $(0AD_VICTORY)


# Playing (and checking if map actually looks correct)
play: $(MOD_INSTALLED)
	$(0AD) $(0AD_FLAGS)


# Uploads *all* mods to FTP server
release: $(MOD_ALL_ZIPPED)
	$(PYTHON) $(PUSH2FTP) --server $(RELEASE_SERVER_FTP) --user $(RELEASE_SERVER_USER) \
        --password $(RELEASE_SERVER_PWD) --path $(RELEASE_SERVER_MODS) \
        --file $(MOD_ALL_ZIPPED) $(UPDATER_WIN) $(UPDATER_UNIX)


# Download from FTP server
update download:
	$(UPDATER_UNIX)

# Cleanup
clean:
	$(RM) $(ZIP_DIR) $(TEST_ROOT)
