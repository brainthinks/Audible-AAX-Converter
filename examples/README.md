# Extras

Everything in this directory was an experiment that I ultimately abandoned, or an experiment that I used to teach myself about a particular subject, technology, or approach.

See the doc block at the top of each file for a description of its purpose.

## Notes

### Matroska Tag Editing

Originally, I assumed I would need to alter some of the tags that existed on the resulting mka file, but it turns out none of them contain any unwanted information.  Here are the installation steps for installing the necessary tools on Linux Mint, which is now no longer needed:

1. wget -q -O - https://mkvtoolnix.download/gpg-pub-moritzbunkus.txt | sudo apt-key add -
1. echo "deb http://mkvtoolnix.download/ubuntu/"$(cat /etc/upstream-release/lsb-release | grep CODENAME | sed 's/DISTRIB_CODENAME=//g')"/ ./" | sudo tee /etc/apt/sources.list.d/bunkus.org.list
1. echo "deb-src http://mkvtoolnix.download/ubuntu/"$(cat /etc/upstream-release/lsb-release | grep CODENAME | sed 's/DISTRIB_CODENAME=//g')"/ ./" | sudo tee --append /etc/apt/sources.list.d/bunkus.org.list
1. sudo apt-get update
1. sudo apt-get install mkvtoolnix mkvtoolnix-gui

