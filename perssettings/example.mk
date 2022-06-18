# The map you currently work on for testing and releasing. Set to 'all'
# to release all maps
# Example:
#   random
#   jebel_barkal_2
MAP_TYPE :=
MAP_NAME :=

# The installation path for custom maps
# Example:
#   /home/lars/snap/0ad/354/.local/share/0ad/mods/user/maps
#   /home/lars/.local/share/0ad/mods/user/maps
MAP_INSTALL_PATH := 

# The 0ad executable and mainlog.html for testing
# Example for linux if it is in the $PATH:
#   0ad
#   /home/lars/.config/0ad/logs/mainlog.html
0AD     := 
0AD_LOG :=

# Credentials for the release server, only for releasing to FTP server
# \todo figure out if this can be entered ad-hoc
# Example
#   user1
#   password123
RELEASE_SERVER_USER :=
RELEASE_SERVER_PWD  :=