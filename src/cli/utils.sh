# Retain the original directory so that as we `cd` around, we can get to the
# proper relative paths defined in the config file.
ORIGINAL_DIR="$(pwd)"

# multi-line command comment prefix
# @see https://stackoverflow.com/a/33401168
REM=""

function join_by () {
  local delimiter=${1};
  shift;

  local items=${1};
  shift;

  printf %s "${items}" "${@/#/${delimiter}}";
}

function log_info () {
  echo "INFO    ℹ️ : $(join_by " - " "$@")"
}

function log_step () {
  echo "STEP    🛠️ : $(join_by " - " "$@")"
}

function log_success () {
  echo "SUCCESS ✅ : $(join_by " - " "$@")"
}

function log_error () {
  echo "ERROR   ❌ : $(join_by " - " "$@")"
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
