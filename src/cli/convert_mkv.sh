#!/usr/bin/env bash

# @todo - catch the readlink failure

# @todo - when the script finishes successfully, the following error message
# is displayed:
# /src/cli/convert_mkv.sh: line 274: unexpected EOF while looking for matching `"'

# NOTE: if readlink fails, the script stops and provides no error message.
# add the 'x' flag here
# set -Eeuox pipefail
set -Eeuo pipefail

PATH_TO_CONFIG="./config/convert_mkv_config.sh"

source "./src/cli/utils.sh"

# Load the user-supplied configuration
source "${PATH_TO_CONFIG}"

# Initialize
mkv_dir=""
mp3_dir=""
playlist_file=""

function set_directories () {
  mkv_dir="$(readlink -f "${MKV_DIR}")"
  mp3_dir="$(readlink -f "${MP3_DIR}")"

  if [ ! -d "${mkv_dir}" ]; then
    log_error "MKV_DIR: ${MKV_DIR}, which resolved to ${mkv_dir}, is not a directory."
    return 1
  fi

  if [ ! -d "${mp3_dir}" ]; then
    log_error "MP3_DIR: ${MP3_DIR}, which resolved to ${mp3_dir}, is not a directory."
    return 1
  fi

  log_info "Using mkv dir: ${mkv_dir}"
  log_info "Using mp3 dir: ${mp3_dir}"

  return 0
}

function initialize_playlist () {
  local handle="${1}"
  local destination_dir="${2}"

  playlist_file="${destination_dir}/${handle}.m3u"

  log_step "Initializing playlist ${playlist_file}..."

  rm -f "${playlist_file}"
  touch "${playlist_file}"

  # vlc puts this at the top of the playlist it generates
  add_to_playlist "#EXTM3U"

  log_success "Playlist initialized: ${handle}"

  return 0
}

function add_to_playlist () {
  echo "${1}" >> "${playlist_file}"

  return 0
}

function _create_chapter_mp3 () {
  local mkv_file="${1}"
  local handle="${2}"
  local destination_dir="${3}"
  local author="${4}"
  local title="${5}"
  local chapter_title="${6}"
  local chapter_start_time="${7}"
  local chapter_end_time="${8}"
  local chapter_count="${9}"

  local jpeg_file="${destination_dir}/${handle}.jpeg"
  local file_name="${destination_dir}/${chapter_title}.mp3"

  log_step "${handle}" "${chapter_title} of ${chapter_count}" "Creating mp3 file..."

  ffmpeg \
    -y \
    -hide_banner \
    -loglevel "panic" \
    ${REM# "order matters!" #} \
    -i "${jpeg_file}" ${REM# "add the cover art directly to the mp3" #} \
    -i "${mkv_file}" \
    -ss "${chapter_start_time}" \
    -to "${chapter_end_time}" \
    ${REM# "map stuff needed for cover art.  also, I think in this order, the" #} \
    ${REM# "metadata from the mkv isn't copied over, which is good." #} \
    -map_metadata "0" \
    -map "0" \
    -map "1" \
    -metadata "title=${chapter_title}" \
    -metadata "artist=${author}" \
    -metadata "album=${title}" \
    -metadata "genre=audiobook" \
    ${REM# "make the mp3s 128kbps CBR" #} \
    -c:a "libmp3lame" \
    -b:a "128k" \
    ${REM# "fix timestamp issues" #} \
    ${REM# "@see - https://trac.ffmpeg.org/wiki/Seeking#Cuttingsmallsections" #} \
    -avoid_negative_ts "1" \
    ${REM# "Support Windows Media Player" #} \
    ${REM# "https://answers.microsoft.com/en-us/windows/forum/windows_7-pictures/how-to-add-id3v24-support-for-windows-7-64bit/a9427521-eb6f-4fe4-affb-f61532846503?auth=1" #} \
    -id3v2_version "3" \
    -sn \
    ${REM# "copy the cover art" #} \
    -c:v "copy" \
    "${file_name}"

  log_success "${handle}" "${chapter_title} of ${chapter_count}" "Successfully created mp3 file"

  add_to_playlist "./${chapter_title}.mp3"

  log_info "${handle}" "${chapter_title} of ${chapter_count}" "Successfully added to playlist"

  return 0
}

function create_mp3s () {
  local mkv_file="${1}"
  local handle="${2}"
  local destination_dir="${3}"
  local author="${4}"
  local title="${5}"

  local chapter_index=0
  local chapter_count=0
  local mkv_info_file="${destination_dir}/mkvinfo.txt"

  mkvinfo "${mkv_file}" > "${mkv_info_file}"

  # Count the number of chapters
  while IFS= read -r line <&3; do
    if [ -z "${line##*"Chapter UID:"*}" ]; then
      ((++chapter_count))
    fi
  done 3< "${mkv_info_file}"

  # @see - https://www.computerhope.com/unix/bash/read.htm
  # @see - http://mywiki.wooledge.org/BashFAQ/089
  # Read every line of the mkvinfo file...
  while IFS= read -r line <&3; do
    # ...when we encounter the line that starts the chapter definition, we
    # know that the next two lines will contain the start and end times
    if [ -z "${line##*"Chapter UID:"*}" ]; then
      ((++chapter_index))

      local chapter_title="Chapter ${chapter_index}"

      IFS= read -r line <&3
      local chapter_start_time="${line/"|   + Chapter time start: "/}"

      IFS= read -r line <&3
      local chapter_end_time="${line/"|   + Chapter time end: "/}"

      _create_chapter_mp3 \
        "${mkv_file}" \
        "${handle}" \
        "${destination_dir}" \
        "${author}" \
        "${title}" \
        "${chapter_title}" \
        "${chapter_start_time}" \
        "${chapter_end_time}" \
        "${chapter_count}"
    fi
  done 3< "${mkv_info_file}"

  rm -f "${mkv_info_file}"

  log_info "${handle}" "All mp3 files and playlist created"

  return 0
}

function create_images () {
  local mkv_file="${1}"
  local handle="${2}"
  local destination_dir="${3}"

  local image_file="${destination_dir}/${handle}.jpeg"
  local cover_image_file="${destination_dir}/cover.jpg"
  local folder_image_file="${destination_dir}/folder.jpg"

  ffmpeg \
    -hide_banner \
    -loglevel panic \
    -y \
    -i "${mkv_file}" \
    -c:v copy \
    -an \
    -sn \
    "${image_file}"

  cp "${image_file}" "${cover_image_file}"
  cp "${image_file}" "${folder_image_file}"

  log_info "${handle}" "Images created"

  return 0
}

function mark_as_complete () {
  local handle="${1}"
  local destination_dir="${2}"
  local complete_file="${destination_dir}/complete.txt"

  rm -f "${complete_file}"
  touch "${complete_file}"

  echo "This file tells the brainthinks/Audible-AAX-Converter scripts that this audiobook has already been successfully converted." >> "${complete_file}"
  echo "Delete this file (or the whole \"${handle}\" audiobook directory) if you want to re-convert." >> "${complete_file}"

  return 0
}

function main () {
  set_directories

  cd "${mkv_dir}"

  # process every audiobook
  for mkv_file in *.mkv; do
    log_info "Processing MKV file: ${mkv_file}"

    AUTHOR="$(ffprobe -i "${mkv_file}" 2>&1 | grep ARTIST | head -1 | sed -e 's/    ARTIST          : \(.*\)/\1/')"
    TITLE="$(ffprobe -i "${mkv_file}" 2>&1 | grep title | head -1 | sed -e 's/    title           : \(.*\)/\1/')"

    # "Your First Listen" does not have an author in the AAX metadata
    if [ -z "${AUTHOR}" ]; then
      AUTHOR="_unknown_"
    fi

    if [ -z "${TITLE}" ]; then
      TITLE="_unknown_"
    fi

    log_info "Found author: ${AUTHOR}"
    log_info "Found title: ${TITLE}"

    audiobook_handle="$(universally_compatible_filename "${AUTHOR} - ${TITLE}")"
    audiobook_directory="${mp3_dir}/${audiobook_handle}"

    mkdir -p "${audiobook_directory}"

    if [ -f "${audiobook_directory}/complete.txt" ]; then
      log_info "${audiobook_handle} already converted, moving to the next audiobook..."
      continue
    fi

    log_step "Processing ${audiobook_handle}..."

    initialize_playlist "${audiobook_handle}" "${audiobook_directory}"
    create_images "${mkv_file}" "${audiobook_handle}" "${audiobook_directory}"
    create_mp3s "${mkv_file}" "${audiobook_handle}" "${audiobook_directory}" "${AUTHOR}" "${TITLE}"
    mark_as_complete "${audiobook_handle}" "${audiobook_directory}"

    log_success "Conversion to mp3 complete: ${audiobook_handle}"
  done

  log_success "Successfully converted all audiobooks to mp3"

  cd "${ORIGINAL_DIR}"

  return 0
}

main

exit 0
