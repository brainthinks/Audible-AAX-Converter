# Audible AAX Converter <!-- omit in toc -->

Put your legally purchased and obtained audiobooks from Audible on the device and player of your choosing, not Amazon's.

## Table of Contents <!-- omit in toc -->

- [Mission Statement](#mission-statement)
- [Linux (Mint, Ubuntu)](#linux-mint-ubuntu)
    - [Prerequisites](#prerequisites)
    - [Getting your activation bytes](#getting-your-activation-bytes)
    - [Downloading your library](#downloading-your-library)
    - [Converting your `AAX` and `AAXC` files](#converting-your-aax-and-aaxc-files)
    - [Preparing your `MKV` files](#preparing-your-mkv-files)
- [Windows](#windows)
- [MacOS](#macos)
- [References](#references)

## Mission Statement

The goals of the project are to allow you to:

1. Retrieve your activation bytes from Audible (via [mkb79/audible-cli](https://github.com/mkb79/audible-cli)), allowing you to decrypt your `AAX` and `AAXC` files.
1. Download your entire library (via [mkb79/audible-cli](https://github.com/mkb79/audible-cli)).
1. Decrypt and convert your `AAX` and `AAXC` files to `MKV` files.
1. Convert your `MKV` files to `mp3` so they can be played on most devices and players.
1. PRESERVE your original `AAX`, `AAXC`, `MKV`, images, and metadata.
1. Close your account if you wish, and still have access to the content you paid for.

I recently realized that Amazon/Audible does not allow you to keep your library, or at least retain access to it, if you don't pay monthly or yearly.  I thought, like with most other services, that if I paid for an individual item, I would not need to pay a recurring service fee to continue to have access to that item.  Therefore, this project has new importance for me.  I can no longer afford to pay a monthly/yearly fee, but I will lose my entire library of audiobooks if I stop.

According to their website (as of 2020):

```text
When your membership is canceled your membership will remain active until the
end of your final billing period. After that, you will no longer be able to
listen to the thousands of included Audible Originals, audiobooks, and podcasts.
Even if they are already in your Library. You can continue to listen to free
podcasts without membership.
```

I want to have access to the things that I pay for on my own terms.

## Linux (Mint, Ubuntu)

### Prerequisites

TODO

You'll need at least ffmpeg (I'm currently using `4.4.2-0ubuntu0.22.04.1`) and jq:

```bash
sudo apt install ffmpeg jq
```

### Getting your activation bytes

This is essentially your decryption key for your AAX files, and possibly also partially for AAXC files. Check out the excellent [mkb79/audible-cli](https://github.com/mkb79/audible-cli) project.

Use that project to retrieve your activation bytes, and store them somewhere, such as in `./config/activation_bytes.txt`.

### Downloading your library

Once again, see the excellent [mkb79/audible-cli](https://github.com/mkb79/audible-cli) for a tool that will allow you to download your entire library.

```bash
audible list

# Note you can replace `-a ASIN` with `--all` to download your entire library.
# In my example command here, I prefer to get the AXX files, since that makes
# decryption simpler, but in some cases, AAXC is the only option. That's fine,
# as this project can now decrypt either format.
audible download -a "${ASIN}" \
    --aax-fallback \
    --pdf \
    --cover \
    --cover-size 1215 \
    --chapter
```

### Converting your `AAX` and `AAXC` files

Note that even though this project has "converter" in the title, this step doesn't actually perform any re-encoding of `AAX` or `AAXC` files.  Instead, the information contained in the files is extracted in its original form, stripped of encryption, and placed in a more open "container" that you can then play on the device or software of your choosing.  This allows us to archive our legally-obtained audiobooks with zero loss in quality and no messy / lossy transcodings or re-encodings (such as from `AAX` to `WAV` to `FLAC` to preserve the audio quality).  It also allows you to keep the cover art and metadata (such as chapters!), which is something that transcoders of `AAX` files typically do not retain.  Also, since the files are almost simply copied and pasted, this script will convert your `AAX` and `AAXC` files about as fast as your hard drive can copy data.

1. All commands are assumed to be run from the project directory
    1. e.g. if you run `ls`, you should see `README.md` etc.
1. Create a config file
    1. `cp ./config/convert_aax_config.sample.sh ./config/convert_aax_config.sh`
1. Modify the values in `./config/convert_aax_config.sh`.  Each var is documented in the file.
1. Run the script!
    1. `./src/cli/convert_aax.sh`

When the script has completed, you can find your files in the directories you supplied in `./config/convert_aax_config.sh`.

### Preparing your `MKV` files

You should now be able to play your `MKV` files with the player of your choosing, though MANY players cannot handle files this large / long. The only one I could get to work on my machine was Celluloid. VLC and SMPlayer fail.  Since these huge files in `MKV` format are not necessarily the most portable, I use them strictly for archival purposes.  Since each book is typically many hours long, I want them to be in a format that just about any device or program can play, and can keep track of. In my experience, most media players on Android devices have difficulty seeking huge files.  If I try to skip around, I am often sent back to the very beginning of the book, and skip ahead by 4 hours to get back to the point where I stopped listening.  Even if I don't seek manually, but use a program that can seek to the time I was at when I stopped listening, the player can't do it, and I am sent back to the beginning.

In my experience, the easiest way to get around these limitations is to split the books up by Chapter, so that each Chapter is its own file.  Since doing that, I have not had a problem seeking and skipping around, and the player I use can resume the book where I last left off.

The player I recommend for this (at least on Android) is Voice Audiobook app, which is on the Google Play store, FDroid, and GitHub:

- Google Play Store: [https://play.google.com/store/apps/details?id=de.ph1b.audiobook&hl=en-US](https://play.google.com/store/apps/details?id=de.ph1b.audiobook&hl=en-US)
- FDroid: [https://f-droid.org/packages/de.ph1b.audiobook/](https://f-droid.org/packages/de.ph1b.audiobook/)
- GitHub: [https://github.com/PaulWoitaschek/Voice](https://github.com/PaulWoitaschek/Voice).

To put these books in a format that is most easily played on the most devices and the most players (in my experience), my script will do the following:

1. Create a single folder per book
    - I used to do a folder for the author, then a folder for the title, but some players, such as Voice, "prefer" the books to not be in nested folders.
1. Split the book into Chapters, one file per Chapter (as defined by the Audible metadata).
1. Convert each chapter to `mp3`
    - Remember, you still have the original archived / preserved as a lossless `MKV`
1. Generate the playlist (`m3u` file) and cover art

Here's how to do it:

1. All commands are assumed to be run from the project directory
    - e.g. if you run `ls`, you should see `README.md` etc.
1. Create a config file
    - `cp ./config/convert_mkv_config.sample.sh ./config/convert_mkv_config.sh`
1. Modify the values in `./config/convert_mkv_config.sh`.  Each var is documented in the file.
1. Run the script!
    - `./src/cli/convert_mkv.sh`

## Windows

TODO

## MacOS

TODO

## References

- [https://github.com/mkb79/Audible/](https://github.com/mkb79/Audible/)
- [https://github.com/mkb79/audible-cli](https://github.com/mkb79/audible-cli)
- [https://github.com/inAudible-NG/audible-activator](https://github.com/inAudible-NG/audible-activator)
- [https://github.com/kholia/inAudible](https://github.com/kholia/inAudible)
- [https://github.com/kennedn/kindlepass](https://github.com/kennedn/kindlepass)
- [https://www.filelem.com/audible-file-format/](https://www.filelem.com/audible-file-format/)
- [https://ffmpeg.org/ffmpeg-codecs.html](https://ffmpeg.org/ffmpeg-codecs.html)
- [https://ffmpeg.org/ffmpeg-bitstream-filters.html](https://ffmpeg.org/ffmpeg-bitstream-filters.html)
- [https://ffmpeg.org/ffmpeg.html](https://ffmpeg.org/ffmpeg.html)
- [https://ffmpeg.org/ffprobe.html](https://ffmpeg.org/ffprobe.html)
- [https://en.wikipedia.org/wiki/Comparison_of_video_container_formats](https://en.wikipedia.org/wiki/Comparison_of_video_container_formats)
- [https://mkvtoolnix.download/index.html](https://mkvtoolnix.download/index.html)
- [https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Your_own_automation_environment](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Your_own_automation_environment)
- [https://www.twilio.com/blog/guide-node-js-logging](https://www.twilio.com/blog/guide-node-js-logging)
- [https://github.com/salesforce/tough-cookie/issues/144](https://github.com/salesforce/tough-cookie/issues/144)
- [https://stackoverflow.com/a/64262075](https://stackoverflow.com/a/64262075)
- [https://patchwork.ffmpeg.org/project/ffmpeg/patch/17559601585196510@sas2-2fa759678732.qloud-c.yandex.net/](https://patchwork.ffmpeg.org/project/ffmpeg/patch/17559601585196510@sas2-2fa759678732.qloud-c.yandex.net/)
