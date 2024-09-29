#!/usr/bin/env bash

# NOTE: if readlink fails, the script stops and provides no error message.
# add the 'x' flag here
set -Eeuo pipefail

PATH_TO_CONFIG="./config/convert_aax_config.sh"

source "./src/cli/utils.sh"

# Load the user-supplied configuration
source "${PATH_TO_CONFIG}"

# Initialize
activation_bytes=""
aax_dir=""
cover_art_dir=""
mkv_dir=""

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
  log_success "Found activation bytes: ${activation_bytes}"
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

function process_aax () {
  aax_file="${1}"

  log_info "Processing ${aax_file}"

  # construct the filename
  AUTHOR="$(ffprobe -activation_bytes "${activation_bytes}" -i "${aax_file}" 2>&1 | grep artist | head -1 | sed -e 's/    artist          : \(.*\)/\1/')"
  TITLE="$(ffprobe -activation_bytes "${activation_bytes}" -i "${aax_file}" 2>&1 | grep title | head -1 | sed -e 's/    title           : \(.*\)/\1/')"

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

  log_step "Extracting cover art..."
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
  log_success "Successfully created ${cover_art_file}"

  log_step "Decrypting audio file..."
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
  log_success "Successfully created ${mkv_file}"
}

function process_aaxc () {
  aaxc_file="${1}"

  log_info "Processing ${aaxc_file}"

  AUTHOR="$(ffprobe -activation_bytes "${activation_bytes}" -i "${aaxc_file}" 2>&1 | grep artist | head -1 | sed -e 's/    artist          : \(.*\)/\1/')"
  TITLE="$(ffprobe -activation_bytes "${activation_bytes}" -i "${aaxc_file}" 2>&1 | grep title | head -1 | sed -e 's/    title           : \(.*\)/\1/')"

  if [ -z "${RENAME}" ]; then
    # @see - https://stackoverflow.com/questions/965053/extract-filename-and-extension-in-bash
    local filename="$(basename -- "${aaxc_file}")"
    local extension="${filename##*.}"
    local file_name="${filename%.*}"
    FILENAME="${file_name}"
  else
    FILENAME="$(universally_compatible_filename "${AUTHOR} - ${TITLE}")"
  fi

  log_info "Found author: ${AUTHOR}"
  log_info "Found title: ${TITLE}"

  log_step "Extracting cover art..."
  cover_art_file="${cover_art_dir}/${FILENAME}_extracted_cover_art.jpg"
  ffmpeg \
    -hide_banner \
    -loglevel panic \
    -y \
    -activation_bytes "${activation_bytes}" \
    -i "${aaxc_file}" \
    -c:v copy \
    -an \
    -sn \
    "${cover_art_file}"
  log_success "Successfully created ${cover_art_file}"

  # Note that this expects that you've already used mkb79/audible-cli, e.g.
  #
  # audible download -a "${ASIN}" \
  #   --aax-fallback \
  #   --pdf \
  #   --cover \
  #   --cover-size 1215 \
  #   --chapter
  #
  log_step "Extracting decryption values from voucher file..."
  voucher_file_name="${aaxc_file%.*}.voucher"
  audible_key="$(jq -r ".content_license.license_response.key" "${voucher_file_name}")"
  audible_iv="$(jq -r ".content_license.license_response.iv" "${voucher_file_name}")"

  log_info "Found key: ${audible_key}"
  log_info "Found iv: ${audible_iv}"

  log_step "Decrypting audio file..."
  mkv_file="${mkv_dir}/${FILENAME}.mkv"
  # @see https://stackoverflow.com/a/64262075
  # @see https://patchwork.ffmpeg.org/project/ffmpeg/patch/17559601585196510@sas2-2fa759678732.qloud-c.yandex.net/
  ffmpeg \
    -hide_banner \
    -loglevel panic \
    -y \
    -activation_bytes "${activation_bytes}" \
    -audible_key "${audible_key}" \
    -audible_iv "${audible_iv}" \
    -i "${aaxc_file}" \
    -c:a copy \
    -c:v copy \
    -sn \
    "${mkv_file}"
  log_success "Successfully created ${mkv_file}"
}

function main () {
  set_activation_bytes
  set_directories

  cd "${aax_dir}"

  for aax_file in *.aax; do
    process_aax "${aax_file}"
  done

  for aaxc_file in *.aaxc; do
    process_aaxc "${aaxc_file}"
  done

  cd "${ORIGINAL_DIR}"
}

main
