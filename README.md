# Audible AAX Converter <!-- omit in toc -->

Put your legally purchased and obtained audiobooks from Audible on the device and player of your choosing, not Amazon's.

## Table of Contents <!-- omit in toc -->

- [Intro](#intro)
- [Windows](#windows)
- [MacOS](#macos)
- [Linux (Ubuntu, Mint)](#linux-ubuntu-mint)
  - [Installation](#installation)
  - [Preparing your Amazon account](#preparing-your-amazon-account)
  - [Getting your `activation_bytes`](#getting-your-activation_bytes)
  - [Downloading your library](#downloading-your-library)
  - [Converting your `AAX` files](#converting-your-aax-files)
  - [Preparing your `MKV` files](#preparing-your-mkv-files)
- [References](#references)

## Intro

The goals of the project are to allow you to:

1. Retrieve your activation bytes from Audible, allowing you to decrypt your `AAX` files.
1. Download your entire library via [https://github.com/mkb79/audible-cli](https://github.com/mkb79/audible-cli).
1. Decrypt and convert your `AAX` files to `MKV` files.
1. Convert your `MKV` files to `mp3` so they can be played on most devices and players.
1. PRESERVE your original `AAX`, `MKV`, images, and metadata.
1. Close your account if you wish, and still have access to the content you paid for.

I recently realized that Amazon/Audible does not allow you to keep your library, or at least retain access to it, if you don't pay monthly or yearly.  I thought, like with most other services, that if I paid for an individual item, I would not need to pay a recurring service fee to continue to have access to that item.  Therefore, this project has new importance for me.  I can no longer afford to pay a monthly/yearly fee, but I will lose my entire library of audiobooks if I stop.

According to their website:

```
When your membership is canceled your membership will remain active until the
end of your final billing period. After that, you will no longer be able to
listen to the thousands of included Audible Originals, audiobooks, and podcasts.
Even if they are already in your Library. You can continue to listen to free
podcasts without membership.
```

To me, this shouldn't even be legal.  So, with this anti-consumer business practice being the reality of my situation, this project is now primarily about archiving the digital content that I paid for.

In addition to converting the `AAX` files, this project can now retrieve your activation bytes for you.  Huge shout out to [inAudible-NG/audible-activator](https://github.com/inAudible-NG/audible-activator).  No part of this project would have been possible without that project.  Also shout out to [FFMPEG](https://ffmpeg.org/), which makes the decryption and conversion possible.

While researching for this project, I came across a few projects that already do what I was aiming to do with this project.  However, they are more mature and appear to be maintained.  The one that looks the best to me is [https://github.com/mkb79/Audible/](https://github.com/mkb79/Audible/).  Therefore, the future of this projects will likely be to create plugins for the [https://github.com/mkb79/audible-cli](https://github.com/mkb79/audible-cli) project.


## Windows

TODO


## MacOS

TODO


## Linux (Ubuntu, Mint)

### Installation

1. Install FFMPEG
    1. `sudo apt-get install ffmpeg libavcodec-ffmpeg56 mkvtoolnix`
1. A recent version of `node` is needed, since most of this project is written in javascript.  I recommend using [tj/n](https://github.com/tj/n) to install and manage node.  You can install `tj/n` using the [`n-install` project](https://github.com/mklement0/n-install):
    1. `curl -L https://git.io/n-install | bash`
1. Clone or download this repo
    1. `git clone https://github.com/brainthinks/Audible-AAX-Converter.git`
1. A browser driver
    1. Right now, only Firefox is supported
    1. Install geckodriver manually or with provided script:
    1. `./scripts/install-geckodriver.sh`
1. Install the npm dependencies
    1. `cd Audible-AAX-Converter`
    1. `yarn` or `npm i`

### Preparing your Amazon account

NOTE - I highly recommend you use [https://github.com/mkb79/Audible](https://github.com/mkb79/Audible) and/or [https://github.com/mkb79/audible-cli](https://github.com/mkb79/audible-cli) to get your activation bytes.  They have done a better and more thorough job than I have, and their solution is more mature and has more features.

If you want to proceed with my `activation_bytes` solution...

Amazon does not like it when you try to authenticate using a script.  It's why I chose to make it use a headless browser.  In creating and testing this script, I had to enable two-factor authentication using the app on my phone.  There are likely other ways, but I found that clicking "allow" in the Android app the easiest.

TODO - unfortunately, I do not have the steps necessary to enable this on your Amazon account.  I don't remember what steps I had to take to get 2FA on my phone.  Another reason to use [https://github.com/mkb79/audible-cli](https://github.com/mkb79/audible-cli) for this part.

In an abundance of caution, I have decided to leave the "headless" firefox (used to authenticate) visible, so that if something does end up happening where you have to enter a one-time-password or code or something, you can at least see what's going on.  If you're brave though, you can switch back to headless firefox.

WARNING - I had to reset my password once while creating this project.  I tried (and failed) to authenticate with the work-in-progress iterations of this script dozens of times, so I doubt you'll have to change your password as long as you don't run it too many times.  You should only need to run it once.

Check [inAudible-NG/audible-activator](https://github.com/inAudible-NG/audible-activator) for more info if you're still uncomfortable.  They even have a [project](https://github.com/inAudible-NG/RainbowCrack-NG) that uses rainbow tables to allow you to figure out what your activation bytes are without ever having to log in to Amazon or Audible.  I haven't tried it, but based on the reputation of `audible-activator`, and the fact that the activation bytes are simply a series of 8 hex characters, I bet it would work.

If you're brave enough to keep going...

### Getting your `activation_bytes`

Your `activation_bytes` is the decryption key needed to convert your `AAX` files to a format without DRM.

To get your activation bytes:

1. Log into your Amazon account in your local Firefox browser (maybe helps?)
1. Make a credentials file, which will be used to read in your account credentials:
    1. `yarn run creds`
1. Edit the file `./` to insert your email and password
1. Run the `cli` script
    1. `yarn run get`
1. If the script completed successfully, you can delete your credentials file if you wish
    1. `yarn run rm-creds`
1. Your activation bytes will be written to `./config/activation_bytes.txt`

### Downloading your library

After discovering the excellent work in the [https://github.com/mkb79/Audible](https://github.com/mkb79/Audible) project, I am not going to duplicate the work that has already been done in that project here.

See the project [https://github.com/mkb79/audible-cli](https://github.com/mkb79/audible-cli) for a tool thata will allow you to download your library.

### Converting your `AAX` files

Note that even though this project has "converter" in the title, this step doesn't actually perform any re-encoding of `AAX` files.  Instead, the information contained in the files is extracted in its original form, stripped of encryption, and placed in a more open "container" that you can then play on the device or software of your choosing.  This allows me (and you) to archive your legally-obtained audiobooks with zero loss in quality and no messy / lossy transcodings or re-encodings (such as from `AAX` to `WAV` to `FLAC` to preserve the audio quality).  It also allows you to keep the cover art and metadata (such as chapters!), which is something that transcoders of `AAX` files typically do not retain.  Also, since the files are almost simply copied and pasted, this script will convert your `AAX` files about as fast as your hard drive can copy data.

1. All commands are assumed to be run from the project directory
    1. e.g. if you run `ls`, you should see `README.md` etc.
1. Create a config file
    1. `cp ./config/convert_aax_config.sample.sh ./config/convert_aax_config.sh`
1. Modify the values in `./config/convert_aax_config.sh`.  Each var is documented in the file.
1. Run the script!
    1. `./src/cli/convert_aax.sh`

Your terminal will show you the `ffmpeg` information related to the conversion of the files.  When the script has completed, you can find your files in the directories you supplied in `./config/convert_aax_config.sh`.

### Preparing your `MKV` files

You should now be able to play your `MKV` files no problem now.  However, these huge files in `MKV` format are not necessarily the most portable, and for me are simply for archival purposes.  Since each book is typically many hours long, I want them to be in a format that just about any device or program can play, and can keep track of.

In my experience, most media players on Android devices have difficulty seeking huge files.  If I try to skip around, I am often sent back to the very beginning of the book, and skip ahead by 4 hours to get back to the point where I stopped listening.  Even if I don't seek manually, but use a program that can seek to the time I was at when I stopped listening, the player can't do it, and I am sent back to the beginning.

In my experience, the easiest way to get around this limitation of these players is to split the books up by Chapter, so that each Chapter is its own file.  Since doing that, I have not had a problem seeking and skipping around, and the player I use can resume the book where I last left off.

The player I recommend for this (at least on Android) is Voice Audiobook app, which is on the Google Play store - [https://play.google.com/store/apps/details?id=de.ph1b.audiobook&hl=en&gl=US](https://play.google.com/store/apps/details?id=de.ph1b.audiobook&hl=en&gl=US).  The project is open source - [https://github.com/PaulWoitaschek/Voice](https://github.com/PaulWoitaschek/Voice).

To put these books in a format that is easiest played on the most devices and the most players (in my experience), I do the following:

1. Create a single folder per book
    1. I used to do a folder for the author, then a folder for the title, but some players, such as Voice, "prefer" the books to not be in nested folders.
1. Split the book into Chapters, one file per Chapter (as defined by the Audible metadata).
1. Convert each chapter to `mp3`
    1. Remember, you still have the original archived / preserved as a lossless `MKV`
1. Generate the playlist (`m3u` file) and cover art

Here's how to do it:

1. All commands are assumed to be run from the project directory
    1. e.g. if you run `ls`, you should see `README.md` etc.
1. Create a config file
    1. `cp ./config/convert_mkv_config.sample.sh ./config/convert_mkv_config.sh`
1. Modify the values in `./config/convert_mkv_config.sh`.  Each var is documented in the file.
1. Run the script!
    1. `./src/cli/convert_mkv.sh`


## References

* [https://github.com/mkb79/Audible/](https://github.com/mkb79/Audible/)
* [https://github.com/mkb79/audible-cli](https://github.com/mkb79/audible-cli)
* [https://github.com/inAudible-NG/audible-activator](https://github.com/inAudible-NG/audible-activator)
* [https://github.com/kholia/inAudible](https://github.com/kholia/inAudible)
* [https://github.com/kennedn/kindlepass](https://github.com/kennedn/kindlepass)
* [https://www.filelem.com/audible-file-format/](https://www.filelem.com/audible-file-format/)
* [https://ffmpeg.org/ffmpeg-codecs.html](https://ffmpeg.org/ffmpeg-codecs.html)
* [https://ffmpeg.org/ffmpeg-bitstream-filters.html](https://ffmpeg.org/ffmpeg-bitstream-filters.html)
* [https://ffmpeg.org/ffmpeg.html](https://ffmpeg.org/ffmpeg.html)
* [https://ffmpeg.org/ffprobe.html](https://ffmpeg.org/ffprobe.html)
* [https://en.wikipedia.org/wiki/Comparison_of_video_container_formats](https://en.wikipedia.org/wiki/Comparison_of_video_container_formats)
* [https://mkvtoolnix.download/index.html](https://mkvtoolnix.download/index.html)
* [https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Your_own_automation_environment](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Your_own_automation_environment)
* [https://www.twilio.com/blog/guide-node-js-logging](https://www.twilio.com/blog/guide-node-js-logging)
* [https://github.com/salesforce/tough-cookie/issues/144](https://github.com/salesforce/tough-cookie/issues/144)
