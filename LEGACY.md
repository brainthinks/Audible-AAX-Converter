# Legacy stuff

I do NOT recommend you use anything documented in this file. I originally wrote this as a learning excercise, and it is now unmaintained and probably doesn't actually work anymore. As I say in countless other places in this project, you really should go use the excellent [mkb79/audible-cli](https://github.com/mkb79/audible-cli) for doing anything with the Audible service.

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
