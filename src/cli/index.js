#!/usr/bin/env node

'use strict';

/**
 * Fetch and subsequently parse an Audible license for the purpose of getting
 * the activation bytes needed to decrypt my legally-obtained Audible AAX files.
 */

const {
  LICENSE_FILE,
  ACTIVATION_BYTES_FILE,
} = require('../lib/consts');

const getActivationBytes = require('../lib/');

// @todo - if these are not supplied in creds.js, throw an error or prompt
// the user to type them
const {
  email,
  password,
} = require('../../assets/creds');

async function main () {
  try {
    const activationBytes = await getActivationBytes(email, password);

    console.log('--------------------------------------------------------------------------------');
    console.log('');
    console.log(`Your license has been written to ${LICENSE_FILE}`);
    console.log('You can delete the license file.');
    console.log('');
    console.log(`Your activation bytes ${activationBytes} have been written to ${ACTIVATION_BYTES_FILE}`);
    console.log('Do not delete the activation bytes file.');
    console.log('');
    console.log('--------------------------------------------------------------------------------');
  }
  catch (error) {
    console.error(error);
    console.error('Failed!  See error message(s) above.');
    process.exit(1);
  }
}

main();
