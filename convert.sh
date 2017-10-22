#!/bin/bash

# include the necessary amazon/audible information
source ./config.sh

universallyCompatibleFilename() {
  shopt -s extglob;

  local -r filename="$1"

  # https://serverfault.com/a/776229
  local compatible_filename=$(echo "$filename" | sed -e 's/[\\/:\*\?"<>\|\x01-\x1F\x7F]/ - /g' -e 's/^\(nul\|prn\|con\|lpt[0-9]\|com[0-9]\|aux\)\(\.\|$\)//i' -e 's/^\.*$//' -e 's/^$/NONAME/')

  compatible_filename=$(echo "$compatible_filename" | sed -e 's/  / /g')

  echo "$compatible_filename"
}

# go to the directory in which all of the downloaded aax files exist
cd $AAX_DIR

# process every audiobook
for i in *.aax; do
  # construct the filename
  AUTHOR=$(ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" 2>&1 | grep artist | head -1 | sed -e 's/    artist          : \(.*\)/\1/')
  TITLE=$(ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" 2>&1 | grep title | head -1 | sed -e 's/    title           : \(.*\)/\1/')
  FILENAME=$(universallyCompatibleFilename "$AUTHOR - $TITLE")

  # save the cover art
  ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" -c:v copy -an -sn "$COVER_ART_DIR/$FILENAME.jpg"

  # save the audio
  ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" -c:a copy -vn -sn "$AUDIO_DIR/$FILENAME.mka"
done
