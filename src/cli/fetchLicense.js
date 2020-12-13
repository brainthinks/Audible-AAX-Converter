'use strict';

const crypto = require('crypto');
const { Builder, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const tough = require('tough-cookie');
const fetch = require('node-fetch');
const queryString = require('query-string');
const fs = require('fs');

const {
  getActivationBytesFromBuffer,
  getActivationBytesFromFile,
} = require('./parseLicense');
const { email, password } = require('../../assets/creds');
const Cookie = tough.Cookie;

let driver;

const baseUrl = 'https://www.audible.com';
const baseUrlLicense = 'https://www.audible.com';
// const USER_AGENT = 'user-agent=Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36';

const LICENSE_FILE = './assets/license.bin';
const ACTIVATION_BYTES_FILE = './assets/activation_bytes.txt';

const TEN_SECONDS = 10 * 1000;
const ONE_MINUTE = 60 * 1000;

/**
 * When we request the player auth token, we need to provide a player id.
 */
function _generatePlayerId () {
  const playerId = crypto.createHash('sha1').digest().toString('base64').trim().toString('ascii');

  return playerId;
}

/**
 * When we request the player auth token, it will be present in the redirect
 * url.
 */
function _getPlayerTokenFromUrl (url) {
  const search = url.split('?')[1];

  const params = queryString.parse(search);

  return params.playerToken;
}

async function authenticate () {
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

  // Go to Audible to get the necessary cookies as well as the link to amazon
  console.log('Navigating to Audible');
  await driver.get(baseUrl);

  // Use the Audible "Sign In" link to go to the necessaray Amazon sign in page
  console.log('Navigating to Amazon Sign In page');
  const amazonSignInLink = await driver.wait(until.elementLocated(By.linkText('Sign In')), TEN_SECONDS);
  await amazonSignInLink.click();

  // Sign In
  console.log('Signing in with Amazon credentials');
  const amazonEmailInput = await driver.wait(until.elementLocated(By.id('ap_email')), TEN_SECONDS);
  const amazonPasswordInput = await driver.wait(until.elementLocated(By.id('ap_password')), TEN_SECONDS);
  const amazonSignInButton = await driver.wait(until.elementLocated(By.id('signInSubmit')), TEN_SECONDS);

  // @todo - if these are not supplied in creds.js, prompt the user to type them
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
}

async function getPlayerToken () {
  console.log('Getting valid player token');

  const playerAuthTokenParams = queryString.stringify({
    playerType: 'software',
    bp_ua: 'y',
    playerModel: 'Desktop',
    playerId: _generatePlayerId(),
    playerManufacturer: 'Audible',
    serial: '',
  });

  const url = `${baseUrl}/player-auth-token?${playerAuthTokenParams}`;

  await driver.get(url);

  const playerToken = _getPlayerTokenFromUrl(await driver.getCurrentUrl());

  console.log(`Got valid player token: ${playerToken}`);

  return playerToken;
}

async function deregister (playerToken) {
  console.log('Deregistering playerToken');

  const params = queryString.stringify({
    customer_token: playerToken,
    action: 'de-register',
  });

  const url = `${baseUrlLicense}/license/licenseForCustomerToken?${params}`;

  const cookieJar = new tough.CookieJar();
  const rawCookies = await driver.manage().getCookies();

  rawCookies.forEach((cookie) => {
    // This seems like a fake cookie, and has a Domain of
    // "noonehasthisdomain.com", which is obviously not "amazon.com".  If we
    // try to add it here, tough cookie throws an error.  Therefore, we are
    // going to ignore it for the time being.
    // if (cookie.toString().startsWith('ap-fid=')) {
    //   return;
    // }

    cookieJar.setCookieSync(Cookie.fromJSON(cookie), baseUrlLicense);
  });

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Audible Download Manager',
      cookie: cookieJar.getCookieStringSync(baseUrlLicense),
    },
  });

  // if (res.status !== '200') {
  //   throw new Error('Failed to deregister!');
  // }

  console.log(`Successfully (${res.status}) deregistered player token: ${playerToken}`);
  console.log(res.headers.raw())
}

async function writeLicenseFile (res, file) {
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

async function getActivationBytes (playerToken) {
  console.log('Fetching license');

  const params = queryString.stringify({
    customer_token: playerToken,
  });

  const url = `${baseUrlLicense}/license/licenseForCustomerToken?${params}`;

  const cookieJar = new tough.CookieJar();
  const rawCookies = await driver.manage().getCookies();

  rawCookies.forEach((cookie) => {
    // This seems like a fake cookie, and has a Domain of
    // "noonehasthisdomain.com", which is obviously not "amazon.com".  If we
    // try to add it here, tough cookie throws an error.  Therefore, we are
    // going to ignore it for the time being.
    // if (cookie.toString().startsWith('ap-fid=')) {
    //   return;
    // }

    cookieJar.setCookieSync(Cookie.fromJSON(cookie), baseUrlLicense);
  });

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Audible Download Manager',
      cookie: cookieJar.getCookieStringSync(baseUrlLicense),
    },
  });

  if (res.status !== 200) {
    console.log(res)
    console.log(res.status)
    throw new Error('Failed to fetch license!');
  }

  let activationBytes;

  // @todo - create an option for this
  if (false) {
    // In case you want to have a copy of the binary file
    await writeLicenseFile(res, LICENSE_FILE);
    activationBytes = getActivationBytesFromFile(LICENSE_FILE);
  }
  else {
    activationBytes = getActivationBytesFromBuffer(await res.buffer());
  }

  console.log(`Successfully fetched license and parsed activation bytes: ${activationBytes}`);

  return activationBytes;
}

async function main () {
  const options = new firefox.Options();

  // If you want to see firefox, you can remove this line
  options.addArguments("-headless");

  options.setPreference('general.useragent.override', USER_AGENT);

  driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  await authenticate();

  const playerToken = await getPlayerToken();

  await deregister(playerToken);

  const activationBytes = await getActivationBytes(playerToken);

  await deregister(playerToken);

  console.log(`Success! Your activation bytes are: ${activationBytes}`);

  fs.writeFileSync(ACTIVATION_BYTES_FILE, activationBytes);

  console.log('--------------------------------------------------------------------------------');
  console.log('');
  console.log(`Your activation bytes ${activationBytes} have been written to ${ACTIVATION_BYTES_FILE}`);
  console.log('');
  console.log('Terminating process in ten seconds...')
  console.log('');
  console.log('--------------------------------------------------------------------------------');

  await driver.sleep(TEN_SECONDS);

  await driver.quit();
}

// @todo - provide tools to allow others to script this rather than just
// executing a "main" function...
main().catch(async (error) => {
  if (driver) {
    try {
      await driver.quit();
    }
    catch (quitError) {
      console.error(quitError);
    }
  }

  console.error(error);
  console.error('Failed!  See error message(s) above.');
  process.exit(1);
});
