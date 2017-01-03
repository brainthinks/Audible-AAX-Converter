#!/bin/bash

# include the necessary amazon/audible information
source ./config.sh

# go to the directory in which all of the downloaded aax files exist
cd $AAX_DIR

# process every audiobook
for i in *.aax; do
  # construct the filename
  AUTHOR=$(ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" 2>&1 | grep artist | head -1 | sed -e 's/    artist          : \(.*\)/\1/')
  TITLE=$(ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" 2>&1 | grep title | head -1 | sed -e 's/    title           : \(.*\)/\1/')
  FILENAME="$AUTHOR - $TITLE"

  # save the cover art
  ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" -c:v copy -an -sn "$COVER_ART_DIR/$FILENAME.jpg"

  # save the audio
  ffmpeg -activation_bytes $ACTIVATION_BYTES -i "$i" -c:a copy -vn -sn "$AUDIO_DIR/$FILENAME.mka"
done