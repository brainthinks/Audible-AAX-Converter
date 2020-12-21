'use strict';

/**
 * The Audible "license" in this context is the binary file / blob that
 * contains license information for the given account, which includes the
 * "activation bytes".
 *
 * After the player token has been retrieved, we can use a request library
 * rather than a browser to make successful authenticated requests.
 */

const fetch = require('node-fetch');
const queryString = require('query-string');
const tough = require('tough-cookie');
const fs = require('fs');

const Cookie = tough.Cookie;

/**
 * Helper to write the fetched license file to disk.
 *
 * This could probably be improved / decoupled.
 */
async function _writeLicenseFile (res, file) {
  try {
    // Delete the one that's already there
    // @todo - back up this file instead of deleting it
    fs.unlinkSync(file);
  }
  catch (error) {
    // do nothing
    console.log('Guess this file didn\'t already exist...');
  }

  const destination = fs.createWriteStream(file);

  return new Promise((resolve, reject) => {
    destination.on('close', () => {
      // @todo - how to detect the reject condition?
      resolve();
    });

    destination.on('error', (error) => {
      console.error(error);
      console.error('error while writing binary file');
      destination.destroy();
    });

    destination.on('finish', () => {
      console.log('done writing binary file');
      destination.destroy();
    });

    res.body.pipe(destination);
  });
}

/**
 * Fetch the license file from Audible and write it to disk.
 *
 * @param {string} baseUrl
 *   The base URL for license requests
 * @param {string} playerToken
 *   The valid player token
 * @param {Array} cookies
 *   The cookies needed to make an authenticated request
 * @param {string} licenseFileDestination
 *   The absolute or relative path to write the license file to
 *
 * @returns {string}
 *   The path the license file was written to, same as `licenseFileDestination`
 */
async function fetchLicenseFile (baseUrl, playerToken, cookies, licenseFileDestination) {
  console.log('Fetching license');

  // The query parameters needed to request the license file
  const params = {
    customer_token: playerToken,
  };

  // The url needed to request the license file
  const url = `${baseUrl}/license/licenseForCustomerToken?${queryString.stringify(params)}`;

  const cookieJar = new tough.CookieJar();

  cookies.forEach((cookie) => {
    cookieJar.setCookieSync(Cookie.fromJSON(cookie), baseUrl);
  });

  const headers = {
    // Tell Audible that this request is coming from the Desktop Application
    'User-Agent': 'Audible Download Manager',
    // Use the cookies to ensure an authenticated session
    cookie: cookieJar.getCookieStringSync(baseUrl),
  };

  const res = await fetch(url, {
    headers,
  });

  if (res.status !== 200) {
    console.log(res)
    console.log(res.status)
    throw new Error('Failed to fetch license!');
  }

  // Alternatively, `await res.buffer()` could be used directly, and there is
  // a parse function to read from a buffer.  However, for the purposes of
  // this script, and for debugging and learning, I want the license file
  // locally.
  await _writeLicenseFile(res, licenseFileDestination);

  console.log(`Successfully wrote license file to "${licenseFileDestination}"`);

  return licenseFileDestination;
}

module.exports = {
  fetchLicenseFile,
};
