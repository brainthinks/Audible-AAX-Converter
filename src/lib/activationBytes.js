'use strict';

/**
 * The "activation bytes" in this context is the sequence of bytes (4 bytes,
 * equaling 8 characters) that can be used to decrypt an Audible AAX file into
 * a DRM-free MP4 file.
 *
 * The functions here perform parsing operations on the license (binary data).
 */

const fs = require('fs');

/**
 * @private
 *
 * Parse the header of a license file.
 *
 * @param {buffer} buffer
 *   The buffer that contains the license data
 *
 * @returns {object}
 *   `startIndex`, which indicates the buffer position where the header starts
 *   `endIndex`, which indicates the buffer position where the header ends
 *   `payload`, the parsed header data
 *   `payload.groupIds`, the `group_id` values
 *   `payload.filled_slot_count`, the number of signatures present in the license
 *   `payload.signature_size`, the byte count of each signature
 */
function _parseHeader (buffer) {
  // Initialize the data object, which will contain the parsed data from the
  // license header
  const data = {
    groupIds: [],
  };

  // The header stops after the last group_id assignment
  const lastGroupIdStart = buffer.lastIndexOf('(group_id=');
  // The last character of the header is a closing parenthesis, so get the
  // closing parenthesis that sits at the end of the last group_id assignment
  const lastGroupIdEnd = buffer.indexOf(')', lastGroupIdStart);

  const startIndex = 0;
  const endIndex = lastGroupIdEnd;

  const plainTextHeaderBuffer = buffer.slice(startIndex, endIndex + 1);
  const plainTextHeaderString = plainTextHeaderBuffer.toString();

  // Create a tuple containing the info from the header
  let entries = plainTextHeaderString.split(/\r?\n/);

  // Populate the `data` object by parsing the header
  entries.forEach((entry) => {
    // remove the surrounding parentheses
    entry = entry.substring(1);
    entry = entry.substring(0, entry.length - 1);

    const [ key, value ] = entry.split('=');

    switch (key) {
      case 'slot': {
        // The slot is the numerical index of the group, which will be captured
        // in the order of the groupIds array.  Therefore, we don't need to
        // retain the slot value.
        break;
      }
      case 'group_id': {
        data.groupIds.push(value);
        break;
      }
      case 'filled_slot_count':
      case 'signature_size': {
        data[key] = parseInt(value, 10);
        break;
      }
      default: {
        data[key] = value;
      }
    }
  });

  return {
    startIndex,
    endIndex,
    payload: data,
  };
}

/**
 * @private
 *
 * Each license file contains a certain number of signatures.  Other than the
 * activation bytes we are after, I have no idea what data they contain.
 *
 * @param {buffer} buffer
 *   The buffer that contains the license data
 * @param {object} headerData
 *   The parsed header data from the license
 *
 * @returns {Array}
 *   All binary signatures from the license file
 */
function _parseSignatures (buffer, headerData) {
  // The binary data we want starts at the index right after the header ends,
  // hence the +1
  const binaryDataBuffer = buffer.slice(headerData.endIndex + 1);

  // Amazon tells us how big each "signature" is in the binary data
  const signatureByteCount = headerData.payload.signature_size;

  const signatures = [];

  // After reviewing the binary data and the Audible Activator project, it
  // seems as though each 70-byte chunk is separated by a "0A" byte.  Therefore,
  // to strip out this "extra" character, we will always offset the start index
  // by 1.
  for (let i = 0; i < headerData.payload.filled_slot_count; i++) {
    const startIndex = i * signatureByteCount + i + 1;
    const endIndex = (i + 1) * signatureByteCount + (i + 1);

    // Thankfully, the data we need needs to be in hex, which is easy to work
    // with here
    const signature = binaryDataBuffer.slice(startIndex, endIndex).toString('hex');

    signatures.push(signature);
  }

  // Looking at the signatures, here is my guess, broken down by bytes:
  // 00-03: the activation/decryption bytes
  // 04-07: the group slot identifier
  // 08-49: all the same, perhaps a user identifier?
  // 50-69: unknown
  //
  // I have no idea what the proper endian-ness is for deciphering these values
  // outside of the activation bytes.
  /* console.log(signatures); */

  return signatures;
}

/**
 * @private
 *
 * Get the activation bytes from the signatures.  Currently, we only take the
 * activation bytes from the first signature.
 *
 * @param {Array} signatures
 *   The signatures extracted from the license file
 *
 * @returns {string}
 *   The activation bytes
 */
function _getActivationBytesFromSignatures (signatures) {
  // There may be other things we can do with the binary data, but right now
  // we only need the first 4 bytes of the first signature.  From what I
  // understand, the bytes need to be converted to little-endian.
  const rawActivationBytes = signatures[0].substring(0, 8);
  const activationBytes = Buffer.from(rawActivationBytes, 'hex').swap32().toString('hex');

  return activationBytes;
}

/**
 * Given a buffer that contains the license data, such as via `fs.readFile`,
 * get the activation bytes.
 *
 * @param {buffer} buffer
 *   The buffer that contains the license data
 *
 * @returns {string}
 *   The activation bytes
 */
function getActivationBytesFromBuffer (buffer) {
  const headerData = _parseHeader(buffer);
  const signatures = _parseSignatures(buffer, headerData);
  const activationBytes = _getActivationBytesFromSignatures(signatures);

  return activationBytes;
}

/**
 * Given a path to a license file, get the activation bytes.
 *
 * @todo - make async
 *
 * @param {string} file
 *   The absolute or relative path to the license file
 *
 * @returns {string}
 *   The activation bytes
 */
function getActivationBytesFromFile (file) {
  const buffer = fs.readFileSync(file);

  const activationBytes = getActivationBytesFromBuffer(buffer);

  return activationBytes;
}

/**
 * @async
 *
 * Write the activation bytes to a file.  Nothing more than a wrapper for
 * `fs.writeFile`.
 *
 * @param {string} activationBytes
 *   The activation bytes that were retrieved from the license file
 * @param {string} file
 *   The relative or absolute path to the file to which the activation bytes
 *   will be written
 *
 * @returns {void}
 */
async function writeActivationBytesToFile (file, activationBytes) {
  fs.writeFileSync(file, activationBytes);
}

module.exports = {
  getActivationBytesFromBuffer,
  getActivationBytesFromFile,
  writeActivationBytesToFile,
};
