'use strict';

// Base URL for authenticating with Audible/Amazon
const baseUrl = 'https://www.audible.com';

// Base URL for fetching license file - broken out to make it slightly easier
// to support other languages in the future.
const baseUrlLicense = 'https://www.audible.com';

// User Agent String to send for requests.  The one that contains `Trident`
// appears to be from old versions of Internet Explorer - I didn't need it,
// but I left it here for reference
// const USER_AGENT = 'user-agent=Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36';

// The relative or absolute path for where to store the license file
const LICENSE_FILE = './assets/license.bin';

// The relative or absolute path for where to store the activation bytes
const ACTIVATION_BYTES_FILE = './assets/activation_bytes.txt';

module.exports = {
  baseUrl,
  baseUrlLicense,
  USER_AGENT,
  LICENSE_FILE,
  ACTIVATION_BYTES_FILE,
};
