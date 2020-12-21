#!/usr/bin/env bash

# @todo - if readlink fails, the script stops and provides no error message.

set -e

PATH_TO_CONFIG="./assets/config.sh"

# Load the user-supplied configuration
source "${PATH_TO_CONFIG}"

# Retain the original directory so that as we `cd` around, we can get to the
# proper relative paths defined in the config file.
ORIGINAL_DIR="$(pwd)"

# Initialize
activation_bytes=""
aax_dir=""
cover_art_dir=""
mkv_dir=""

function log_info () {
  echo "INFO : ${1}"
}

function log_error () {
  echo "ERROR: ${1}"
}

# Get the activation bytes from either the ACTIVATION_BYTES var directly or
# by getting the contents of the ACTIVATION_BYTES_FILE.
function set_activation_bytes () {
  if [ -z "${ACTIVATION_BYTES}" ] && [ -z "${ACTIVATION_BYTES_FILE}" ]; then
    log_error "You must supply either ACTIVATION_BYTES or ACTIVATION_BYTES_FILE in ${PATH_TO_CONFIG}"
    return 1
  fi

  local activation_bytes_file="$(readlink -f "${ACTIVATION_BYTES_FILE}")"

  if [ -z "${ACTIVATION_BYTES}" ]; then
    if [ ! -f "${activation_bytes_file}" ]; then
      log_error "ACTIVATION_BYTES_FILE: ${ACTIVATION_BYTES_FILE} resolved to ${activation_bytes_file}, which is not a real file."
      return 1
    fi

    log_info "Looking for activation bytes in ${activation_bytes_file}"
    ACTIVATION_BYTES="$(cat "${activation_bytes_file}")"
  fi

  # @todo - could do a regex check here to validate only hex characters
  if [ ${#ACTIVATION_BYTES} -ne 8 ]; then
    log_error "Retrieved invalid ACTIVATION_BYTES from ACTIVATION_BYTES_FILE: ${activation_bytes_file}"
    return 1
  fi

  activation_bytes="${ACTIVATION_BYTES}"
  log_info "Found activation bytes: ${activation_bytes}"
  return 0
}

function set_directories () {
  aax_dir="$(readlink -f "${AAX_DIR}")"
  cover_art_dir="$(readlink -f "${COVER_ART_DIR}")"
  mkv_dir="$(readlink -f "${MKV_DIR}")"

  if [ ! -d "${aax_dir}" ]; then
    log_error "AAX_DIR: ${AAX_DIR}, which resolved to ${aax_dir}, is not a directory."
    return 1
  fi

  if [ ! -d "${cover_art_dir}" ]; then
    log_error "COVER_ART_DIR: ${COVER_ART_DIR}, which resolved to ${cover_art_dir}, is not a directory."
    return 1
  fi

  if [ ! -d "${mkv_dir}" ]; then
    log_error "MKV_DIR: ${MKV_DIR}, which resolved to ${mkv_dir}, is not a directory."
    return 1
  fi

  log_info "Using aax dir: ${aax_dir}"
  log_info "Using cover art dir: ${cover_art_dir}"
  log_info "Using mkv dir: ${mkv_dir}"
  return 0
}

# The Audible files and metadata contains some file-system-unfriendly
# characters.  This helper function will generate a string that only contains
# characters that are safe for file names.  Tested on Windows and Ubuntu/Mint.
function universally_compatible_filename () {
  shopt -s extglob;

  local -r filename="${1}"

  # https://serverfault.com/a/776229
  local compatible_filename="$(echo "${filename}" | sed -e 's/[\\/:\*\?"<>\|\x01-\x1F\x7F]/ - /g' -e 's/^\(nul\|prn\|con\|lpt[0-9]\|com[0-9]\|aux\)\(\.\|$\)//i' -e 's/^\.*$//' -e 's/^$/NONAME/')"

  compatible_filename="$(echo "${compatible_filename}" | sed -e 's/  / /g')"

  echo "${compatible_filename}"
  return 0
}

function main () {
  set_activation_bytes
  set_directories

  cd "${aax_dir}"

  # process every audiobook
  for aax_file in *.aax; do
    log_info "Processing ${aax_file}"

    # construct the filename
    AUTHOR="$(ffmpeg -activation_bytes "${activation_bytes}" -i "${aax_file}" 2>&1 | grep artist | head -1 | sed -e 's/    artist          : \(.*\)/\1/')"
    TITLE="$(ffmpeg -activation_bytes "${activation_bytes}" -i "${aax_file}" 2>&1 | grep title | head -1 | sed -e 's/    title           : \(.*\)/\1/')"

    if [ -z "${RENAME}" ]; then
      # @see - https://stackoverflow.com/questions/965053/extract-filename-and-extension-in-bash
      local filename="$(basename -- "${aax_file}")"
      local extension="${filename##*.}"
      local file_name="${filename%.*}"
      FILENAME="${file_name}"
    else
      FILENAME="$(universally_compatible_filename "${AUTHOR} - ${TITLE}")"
    fi

    log_info "Found author: ${AUTHOR}"
    log_info "Found title: ${TITLE}"

    # save the cover art
    cover_art_file="${cover_art_dir}/${FILENAME}_extracted_cover_art.jpg"
    ffmpeg \
      -hide_banner \
      -loglevel panic \
      -y \
      -activation_bytes "${activation_bytes}" \
      -i "${aax_file}" \
      -c:v copy \
      -an \
      -sn \
      "${cover_art_file}"
    log_info "Successfully created ${cover_art_file}"

    # save the audio
    mkv_file="${mkv_dir}/${FILENAME}.mkv"
    ffmpeg \
      -hide_banner \
      -loglevel panic \
      -y \
      -activation_bytes "${activation_bytes}" \
      -i "${aax_file}" \
      -c:a copy \
      -c:v copy \
      -sn \
      "${mkv_file}"
    log_info "Successfully created ${mkv_file}"

  done

  cd "${ORIGINAL_DIR}"
}

main
