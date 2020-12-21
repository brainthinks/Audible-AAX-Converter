'use strict';

/**
 * Functions to authenticate with Amazon and for getting an Audible player
 * token.  A valid player token is necessary for retrieving the license file,
 * which contains the activation bytes.
 *
 * Note that it is probably important to deregister the player token after
 * every successful operation, including before and after retrieving the
 * license file.  I have no idea how Audible tracks these things, so I am
 * following the advice of the `inAudible-NG/audible-activator` project.
 */

const crypto = require('crypto');
const { By, until } = require('selenium-webdriver');
const fetch = require('node-fetch');
const queryString = require('query-string');
const tough = require('tough-cookie');

const Cookie = tough.Cookie;

const ONE_MINUTE = 60 * 1000;
const TEN_SECONDS = 10 * 1000;

/**
 * When we request the player auth token, we need to provide a player id.
 *
 * Algorithm adapted from the `inAudible-NG/audible-activator` project.  I
 * don't know why it works.
 *
 * @returns {string}
 *   A valid player id
 */
function _generatePlayerId () {
  const playerId = crypto.createHash('sha1').digest().toString('base64').trim().toString('ascii');

  return playerId;
}

/**
 * When we request the player auth token, it will be present in the query
 * parameters of the url that we get redirected to. This function extracts said
 * player auth token.
 *
 * Adapted from the `inAudible-NG/audible-activator` project.  I don't know how
 * it was determined that this was necessary or how to ask for it.
 *
 * @param {string} url
 *   The url
 *
 * @returns {string}
 *   The player auth token
 */
function _getPlayerTokenFromUrl (url) {
  const search = url.split('?')[1];

  const params = queryString.parse(search);

  return params.playerToken;
}

/**
 * Authenticate with Amazon to get the cookies needed to make authenticated
 * requests with Audible.  Currently, the cookies will be "added to" the driver
 * instance.
 *
 * Perhaps what really needs to be returned here are the cookies that are
 * present in the driver.  If subsequent steps only need the cookies, we can
 * reduce / eliminate the coupling with selenium webdriver.  This file will
 * always need to use selenium webdriver, but the file that calls it would not.
 *
 * Currently, due to Amazon's authentication security policies, I don't know
 * of a reliable way to authenticate that doesn't involve using a headless
 * (or non-headless) browser.  I tried using cURL, (@see: the examples dir),
 * but I was unable to successfully authenticate.  It would be more efficient
 * if there was a way to do this from a simple request library rather than
 * having to load and run an entire browser.
 *
 * @param {object} driver
 *   The selenium webdriver instance
 * @param {string} baseUrl
 *   The base url for Audible
 * @param {string} email
 *   The email of the account to authenticate with
 * @param {string} password
 *   The password of the account to authenticate with
 */
async function authenticate (driver, baseUrl, email, password) {
  console.log('--------------------------------------------------------------------------------');
  console.log('');
  console.log('Your interaction will likely be required during the authentication process.');
  console.log('Amazon may detect that you are using a script to connect to their site.');
  console.log('You will likely need to enable Two/Multi Factor Authentication (2FA/MFA),');
  console.log('which may be required during this process.');
  console.log('');
  console.log('You should probably have your phone handy.');
  console.log('');
  console.log('When you are ready to get started, press enter.');
  console.log('');
  console.log('--------------------------------------------------------------------------------');

  // Go to Audible to get the necessary cookies as well as the link to Amazon
  console.log('Navigating to Audible');
  await driver.get(baseUrl);

  // Use the Audible "Sign In" link that exists on the page to go to the
  // necessary Amazon sign in page
  console.log('Navigating to Amazon Sign In page');
  const amazonSignInLink = await driver.wait(until.elementLocated(By.linkText('Sign In')), TEN_SECONDS);
  await amazonSignInLink.click();

  // Sign In using Amazon credentials
  console.log('Signing in with Amazon credentials');
  const amazonEmailInput = await driver.wait(until.elementLocated(By.id('ap_email')), TEN_SECONDS);
  const amazonPasswordInput = await driver.wait(until.elementLocated(By.id('ap_password')), TEN_SECONDS);
  const amazonSignInButton = await driver.wait(until.elementLocated(By.id('signInSubmit')), TEN_SECONDS);

  await amazonEmailInput.sendKeys(email);
  await amazonPasswordInput.sendKeys(password);

  await amazonSignInButton.click();

  // Step 4
  // Wait for the user to confirm MFA/2FA
  console.log('--------------------------------------------------------------------------------');
  console.log('');
  console.log('You will likely be prompted to authenticate using Two Factor Authentication,');
  console.log('e.g. approve the login request with your phone');
  console.log('');
  console.log('--------------------------------------------------------------------------------');

  await driver.wait(until.titleContains('Audible'), ONE_MINUTE);

  console.log('Successfully authenticated!');

  return driver;
}

/**
 * After authenticating, ask Audible for a player token, which is needed to
 * request the license file.
 *
 * Adapted from the `inAudible-NG/audible-activator` project.  I don't know how
 * it was determined that this was necessary or how to ask for it.
 *
 * @param {object} driver
 *   The selenium webdriver instance
 * @param {string} baseUrl
 *   The base url for Audible
 *
 * @returns {string}
 *   The player token
 */
async function fetchPlayerToken (driver, baseUrl) {
  console.log('Getting valid player token');

  // These query parameters are necessary when requesting the player token.
  const playerAuthTokenParams = {
    playerType: 'software',
    bp_ua: 'y',
    playerModel: 'Desktop',
    playerId: _generatePlayerId(),
    playerManufacturer: 'Audible',
    serial: '',
  };

  // Make a request to get the player token
  const playerTokenRequestUrl = `${baseUrl}/player-auth-token?${queryString.stringify(playerAuthTokenParams)}`;

  await driver.get(playerTokenRequestUrl);

  // The url that we get redirected to will have the player token in the query
  // parameters
  const playerTokenResponseUrl = await driver.getCurrentUrl();

  const playerToken = _getPlayerTokenFromUrl(playerTokenResponseUrl);

  console.log(`Got valid player token: ${playerToken}`);

  return playerToken;
}

/**
 * Deregister a player token.  According the license file, there are only 8
 * "slots" available for valid / active player tokens.  I don't know if that
 * is even a correct statement, and I don't know anything about the register
 * or deregister process other than this request logic.
 *
 * Adapted from the `inAudible-NG/audible-activator` project.  I don't know how
 * it was determined that this was necessary or how to make the request.
 *
 * @param {string} baseUrl
 *   The base URL for license requests
 * @param {string} playerToken
 *   The player token to deregister
 * @param {Array} cookies
 *   The cookies needed to make an authenticated request
 *
 * @returns {void}
 */
async function deregister (baseUrl, playerToken, cookies) {
  console.log('Deregistering playerToken');

  // The query parameters needed to deregister a player token
  const params = {
    customer_token: playerToken,
    action: 'de-register',
  };

  // The url needed to deregister a token
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

  console.log(`Successfully (${res.status}) deregistered player token: ${playerToken}`);
  // console.log(res.headers.raw())
}

module.exports = {
  authenticate,
  fetchPlayerToken,
  deregister,
};
