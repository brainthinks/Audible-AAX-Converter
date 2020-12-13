# Audible AAX Converter

Note that even though this project has "converter" in the title, it doesn't actually perform any re-encoding of aax files.  Instead, the information contained in the files are extracted in their original form, stripped of encryption, and placed in a more open "container" that you can then play on the device or software of your choosing.  This allows me (and you) to archive your legally-obtained audiobooks with zero loss in quality and no messy transcodings (such as from AAX to WAV to FLAC to preserve the audio quality).  It also allows you to keep the cover art and metadata (such as chapters!), which is something that transcoders of AAX files typically do not retain.  Also, since the files are almost simply copied and pasted, this script will convert your aax files about as fast as your hard drive can copy data.

2020 Update: I recently realized that Amazon/Audible does not allow you to keep your library, or at least retain access to it, if you don't pay monthly or yearly.  I thought, like with most other services, that if I paid for an individual item, I would not need to pay a recurring service fee to continue to have access to that item.  Therefore, this project has new importance for me.  I can no longer afford to pay a monthly/yearly fee, but I will lose my entire library of audiobooks if I stop.  According to their website:

```
When your membership is canceled your membership will remain active until the end of your final billing period. After that, you will no longer be able to listen to the thousands of included Audible Originals, audiobooks, and podcasts. Even if they are already in your Library. You can continue to listen to free podcasts without membership.
```

To me, this shouldn't even be legal.  So, with this anti-consumer business practice being the reality of my situation, this project is now primarily about archiving the digital content that I paid for.

## Installation (for Linux only)

First, you'll need to get a copy of audible-activator.  You can simply download the repository as a zip file.  Note that this has it's own set of installation instructions, so be sure to read those carefully.

Second, for Ubuntu:

1. sudo apt-get install ffmpeg libavcodec-ffmpeg56

Third, download this repo as a zip and extract it.


## Use

First, run audible-activator using its instructions and take note of your activation_bytes key and Player ID (Player ID is optional).

Create a config file for yourself, such as by using the sample file as a template:

```
cp config.sample.sh config.sh
```

Open that config.sh file up and modify it to meet your needs.  You'll need to supply the following:

1. PLAYER_ID - this comes from audible-activator. this value isn't used by this script yet, but audible-activator gives it to us, so I wanted to be able to keep track of it just in case
1. ACTIVATION_BYTES - this is the main piece of information that comes from audible-activator - it is 8 characters long
1. AAX_DIR - the path to your AAX files
1. COVER_ART_DIR - the directory you'd like to have your extracted cover art saved (be sure this directory exists!)
1. AUDIO_DIR - the directory you'd like to have your audiobook audio saved (be sure this directory exists!)

In order to get your ACTIVATION_BYTES key, you'll need to run the audible-activator.

Once you have installed all of the dependencies from the "Installation" section above and correctly set all variables in the config file, you can run the program:

```
./convert.sh
```

Your terminal will show you the ffmpeg information related to the conversion of the files.  When the script has completed, you can find your files in the directories you supplied for COVER_ART_DIR and AUDIO_DIR.


## Assumptions

While it is not assumed, it is easiest if you run the script from the directory that this project is in.

The file "config.sh" needs to be in the pwd of your current terminal.

The AAX_DIR directory, if supplied as relative rather than absolute, will be relative the pwd of your current terminal.

The COVER_ART_DIR and AUDIO_DIR, if supplied as relative rather than absolute paths, will be relative to the AAX_DIR directory, NOT the directory you are currently in.

The COVER_ART_DIR and AUDIO_DIR exist.

The cover art and audio files will be renamed to reflect the author and title, in the form "author - title".  These values are derived from the metadata on the AAX file, so they should be accurate.


## Notes

### Matroska Tag Editing

Originally, I assumed I would need to alter some of the tags that existed on the resulting mka file, but it turns out none of them contain any unwanted information.  Here are the installation steps for installing the necessary tools on Linux Mint, which is now no longer needed:

1. wget -q -O - https://mkvtoolnix.download/gpg-pub-moritzbunkus.txt | sudo apt-key add -
1. echo "deb http://mkvtoolnix.download/ubuntu/"$(cat /etc/upstream-release/lsb-release | grep CODENAME | sed 's/DISTRIB_CODENAME=//g')"/ ./" | sudo tee /etc/apt/sources.list.d/bunkus.org.list
1. echo "deb-src http://mkvtoolnix.download/ubuntu/"$(cat /etc/upstream-release/lsb-release | grep CODENAME | sed 's/DISTRIB_CODENAME=//g')"/ ./" | sudo tee --append /etc/apt/sources.list.d/bunkus.org.list
1. sudo apt-get update
1. sudo apt-get install mkvtoolnix mkvtoolnix-gui


## References

* [https://github.com/inAudible-NG/audible-activator](https://github.com/inAudible-NG/audible-activator)
* [https://ffmpeg.org/ffmpeg-codecs.html](https://ffmpeg.org/ffmpeg-codecs.html)
* [https://ffmpeg.org/ffmpeg-bitstream-filters.html](https://ffmpeg.org/ffmpeg-bitstream-filters.html)
* [https://ffmpeg.org/ffmpeg.html](https://ffmpeg.org/ffmpeg.html)
* [https://ffmpeg.org/ffprobe.html](https://ffmpeg.org/ffprobe.html)
* [https://en.wikipedia.org/wiki/Comparison_of_video_container_formats](https://en.wikipedia.org/wiki/Comparison_of_video_container_formats)
* [https://mkvtoolnix.download/index.html](https://mkvtoolnix.download/index.html)
