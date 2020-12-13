'use strict';

const fs = require('fs');

function _parseHeader (buffer) {
  const lastGroupIdStart = buffer.lastIndexOf('(group_id=');
  const lastGroupIdEnd = buffer.indexOf(')', lastGroupIdStart);

  const startIndex = 0;
  const endIndex = lastGroupIdEnd;

  // @todo - is header an incorrect term?  This is the plain text portion of
  // the file.
  const plainTextHeaderBuffer = buffer.slice(startIndex, endIndex + 1);
  const plainTextHeaderString = plainTextHeaderBuffer.toString();

  // Create a tuple containing the info from the header
  let entries = plainTextHeaderString.split(/\r?\n/);

  const data = {
    groupIds: [],
  };

  entries.forEach((entry) => {
    // remove the surrounding parentheses
    entry = entry.substring(1);
    entry = entry.substring(0, entry.length - 1);

    const [ key, value ] = entry.split('=');

    switch (key) {
      case 'slot': {
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

function _parseSignatures (buffer, headerData) {
  // The binary data we want starts at the index right after the header ends,
  // hence the +1
  const binaryDataBuffer = buffer.slice(headerData.endIndex + 1);

  // Amazon tells us how big each "signature" is in the binary data
  const entryByteCount = headerData.payload.signature_size;

  const signatures = [];

  // After reviewing the binary data and the Audible Activator project, it
  // seems as though each 70-byte chunk is separated by a "0A" byte.  Therefore,
  // to strip out this "extra" character, we will always offset the start index
  // by 1.
  for (let i = 0; i < headerData.payload.filled_slot_count; i++) {
    const startIndex = i * entryByteCount + i + 1;
    const endIndex = (i + 1) * entryByteCount + (i + 1);

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

function _getActivationBytesFromSignatures (signatures) {
  // There may be other things we can do with the binary data, but right now
  // we only need the first 4 bytes of the first signature.  From what I
  // understand, the bytes need to be converted to little-endian.
  const rawActivationBytes = signatures[0].substring(0, 8);
  const activationBytes = Buffer.from(rawActivationBytes, 'hex').swap32().toString('hex');

  return activationBytes;
}

function getActivationBytesFromBuffer (buffer) {
  const headerData = _parseHeader(buffer);
  const signatures = _parseSignatures(buffer, headerData);
  const activationBytes = _getActivationBytesFromSignatures(signatures);

  return activationBytes;
}

function getActivationBytesFromFile (file) {
  const buffer = fs.readFileSync(file);

  const activationBytes = getActivationBytesFromBuffer(buffer);

  return activationBytes;
}

module.exports = {
  getActivationBytesFromBuffer,
  getActivationBytesFromFile,
};
