'use strict';

/**
 * The function that is exported from this file is my script or solution or
 * algorithm for getting the activation bytes from Audible.
 *
 * This project was adapted from the excellent work of the
 * `inAudible-NG/audible-activator` project:
 *
 * https://github.com/inAudible-NG/audible-activator
 *
 * Thanks to their work, I did not have to reverse engineer requests from the
 * Audible desktop application.
 */

const { Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const {
  baseUrl,
  baseUrlLicense,
  USER_AGENT,
  LICENSE_FILE,
  ACTIVATION_BYTES_FILE,
} = require('../lib/consts');

const {
  authenticate,
  fetchPlayerToken,
  deregister,
} = require('./auth');

const {
  fetchLicenseFile,
} = require('./license');

const {
  getActivationBytesFromFile,
  writeActivationBytesToFile,
} = require('./activationBytes');

const TEN_SECONDS = 10 * 1000;

/**
 * Use the provided email and password to authenticate with Audible to retrieve
 * the activation bytes necessary to decrypt Audible AAX files.
 *
 * @param {string} email
 *   The email of the Amazon account
 * @param {string} password
 *   The password of the Amazon account
 *
 * @returns {string}
 *   The activation bytes
 */
async function getActivationBytes (email, password) {
  let driver;

  try {
    const options = new firefox.Options();

    // If you want to hide firefox, uncomment this line
    // options.addArguments("-headless");

    options.setPreference('general.useragent.override', USER_AGENT);

    driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();

    // Before we can start asking Audible for stuff, we need to authenticate.
    await authenticate(driver, baseUrl, email, password);

    // Once we are authenticated, we need to request a player token
    const playerToken = await fetchPlayerToken(driver, baseUrl);

    // Now that we are authenticated and have gotten the player token out of the
    // last redirect url, we can use a request library to make requests.  Get the
    // cookies from the selenium webdriver instance to be able to use them for
    // subsequent requests that will not be using selenium webdriver.
    const cookies = await driver.manage().getCookies();

    // In case we have used this player token before, deregister it
    await deregister(baseUrlLicense, playerToken, cookies);

    // With our valid player token, we can ask for the license file and extract
    // the activation bytes.
    await fetchLicenseFile(baseUrlLicense, playerToken, cookies, LICENSE_FILE);

    // Once we have the license file, we won't be making any more requests with
    // this player token, so deregister it.
    await deregister(baseUrlLicense, playerToken, cookies);

    // The fun stuff.  Now that we have the license file, retrieve the activation
    // bytes from it.
    const activationBytes = getActivationBytesFromFile(LICENSE_FILE);

    // Write the activation bytes to disk, - we'll need them later
    await writeActivationBytesToFile(ACTIVATION_BYTES_FILE, activationBytes);

    await driver.sleep(TEN_SECONDS);
    await driver.quit();

    return activationBytes;
  }
  catch (error) {
    if (driver) {
      try {
        await driver.quit();
      }
      catch (quitError) {
        console.error(quitError);
      }
    }

    throw error;
  }
}

module.exports = getActivationBytes;
