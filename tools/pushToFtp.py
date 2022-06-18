#!/usr/bin/python

import os
import sys
from ftplib import FTP 
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--server", required=True, help="Ftp server")
parser.add_argument("--user", required=True, help="Ftp user")
parser.add_argument("--password", required=True, help="Ftp password")
parser.add_argument("--path", required=True, help="Ftp server destination path, starts with /www")
parser.add_argument("--file", required=True, nargs='+', help="File to upload")
args = parser.parse_args()
    
ftpServer = args.server
ftpLogin = args.user
ftpPassword = args.password
ftpFolder = args.path

destPath = args.path
files = args.file

def push():
    ftp = FTP()
    ftp.set_debuglevel(2)
    ftp.connect(ftpServer, 21) 
    ftp.login(ftpLogin, ftpPassword)
    ftp.cwd(ftpFolder)
    for file in files:
        print(destPath + "/" + os.path.basename(file))
        #continue
        fp = open(file, 'rb')
        ftp.storbinary('STOR %s' % os.path.basename(destPath + "/" + os.path.basename(file)), fp, 1024)
        fp.close()

if __name__=="__main__":
    push()

