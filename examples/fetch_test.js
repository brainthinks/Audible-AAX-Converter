'use strict';

/**
 * WARNING - I advise you not to run this script or try to modify it to suite
 * whatever you needs are.  I abandoned this version of the activation bytes
 * retrieval script because Amazon "doesn't like it" when you try to
 * authenticate with curl.  I was forced to change my password once, and
 * because of this I ended up enabling MFA, which Amazon forced me to do now
 * everytime I run the real version of the script (the one in `src/cli`).
 *
 * You have been warned.
 */

const { exec } = require('child_process');
const crypto = require('crypto');
const queryString = require('query-string');
const find = require('lodash/find');
const fetch = require('node-fetch');
const tough = require('tough-cookie');
const jsdom = require("jsdom");

const { email, password } = require('../assets/creds');

const Cookie = tough.Cookie;
const { JSDOM } = jsdom;

async function curl (url, options) {
  const headers = options.headers;
  const curlHeaders = [];

  for (let name in headers) {
    const value = headers[name];

    curlHeaders.push(`-H '${name}: ${value}'`);
  }

  return new Promise((resolve, reject) => {
    const command = `curl '${url}' ${curlHeaders.join(' ')} --data-raw '${options.body}' --compressed -v`;
    console.log(command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }

      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);

      resolve();
    });
  });
}

const defaultHeaders = {
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "pragma": "no-cache",
  "upgrade-insecure-requests": "1",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-user": "?1",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36",
};

/**
 * A helper function to put all response headers in a cookieJar
 */
function _addFetchResponseHeadersToCookieJar (res, baseUrl, cookieJar) {
  const rawCookies = res.headers.raw()['set-cookie'];
  const cookies = Array.isArray(rawCookies)
    ? rawCookies.map(Cookie.parse)
    : [Cookie.parse(rawCookies)];

  cookies.forEach((cookie) => {
    // This seems like a fake cookie, and has a Domain of
    // "noonehasthisdomain.com", which is obviously not "amazon.com".  If we
    // try to add it here, tough cookie throws an error.  Therefore, we are
    // going to ignore it for the time being.
    if (cookie.toString().startsWith('ap-fid=')) {
      return;
    }

    cookieJar.setCookieSync(cookie, baseUrl);
  });
}

function _generatePlayerId () {
  const playerId = crypto.createHash('sha1').digest().toString('base64').trim().toString('ascii');

  return playerId;
}

function _generateSignInReferralUrl (amazonBaseUrl, audibleBaseUrl, audibleSessionData) {
  const url = `${amazonBaseUrl}ap/signin`;
  const playerId = _generatePlayerId();

  const params = queryString.stringify({
    'clientContext': audibleSessionData.ubidMain,
    'openid.return_to': audibleBaseUrl,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.assoc_handle': 'audible_shared_web_us',
    'openid.mode': 'checkid_setup',
    'marketPlaceId': 'AF2M0KC94RCEA',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    'pageId': 'amzn_audible_bc_us',
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.pape.max_auth_age': '900',
    'siteState': [
      'audibleid.userType=amzn',
      'audibleid.mode=id_res',
      `clientContext=${audibleSessionData.sessionId}`,
      `sourceUrl=${encodeURIComponent(`${audibleBaseUrl}?`)}`,
      'signature=WEj2BEnEnKk3CCSK4GYmNIsQdAoocj3D',
    ].join(','),
    // 'pf_rd_p': '8306127c-de5a-430c-ba9c-48072ff3f1b7',
    // 'pf_rd_r': 'YED1684DAA0Q0XCPBF0W',
  });

  const fullUrl = `${url}?${params}`;

  return fullUrl;
}

/**
 * Get the audible session id, which is needed to construct the referrer url
 * when authenticating.
 */
async function getAudibleSessionData (audibleBaseUrl, cookieJar) {
  console.log(`About to get audible session data from ${audibleBaseUrl}`);

  const res = await fetch(audibleBaseUrl, {
    method: 'GET',
    body: null,
    referrerPolicy: 'no-referrer-when-downgrade',
    mode: 'cors',
    redirect: 'manual',
    headers: {
      ...defaultHeaders,
      'sec-fetch-site': 'none',
    },
  });

  console.log(`Finished getting audible session data from ${audibleBaseUrl}, with status of ${res.status}, capturing cookies`);

  _addFetchResponseHeadersToCookieJar(res, audibleBaseUrl, cookieJar);

  console.log(`audible session data cookies successfully captured for ${audibleBaseUrl}`);

  const sessionId = find(cookieJar.serializeSync().cookies, { key: 'session-id' }).value;
  const ubidMain = find(cookieJar.serializeSync().cookies, { key: 'ubid-main' }).value;

  const sessionData = {
    sessionId,
    ubidMain,
  };

  console.log(`Finished with ${audibleBaseUrl}:`, sessionData);

  return sessionData;
}

/**
 * Authentication is done through Amazon, not Audible.  The Amazon session id
 * is needed for the "signin" request.
 */
async function getAmazonSessionData (amazonBaseUrl, audibleBaseUrl, cookieJar, audibleSessionData) {
  console.log(`About to get amazon session data from ${amazonBaseUrl} using the following audibleSessionData: `, audibleSessionData);

  const fullUrl = _generateSignInReferralUrl(amazonBaseUrl, audibleBaseUrl, audibleSessionData);

  const res = await fetch(fullUrl, {
    method: 'GET',
    mode: 'cors',
    referrer: audibleBaseUrl,
    referrerPolicy: 'no-referrer-when-downgrade',
    body: null,
    redirect: 'manual',
    headers: {
      'sec-fetch-site': 'cross-site',
      'cookie': 'csm-hit=tb:JEVE6ZJHNMW2NSSRANV5+s-JEVE6ZJHNMW2NSSRANV5|1607809949302&t:1607809949302&adb:adblk_no',
    },
  });

  console.log(`Finished getting amazon session data from ${amazonBaseUrl}, with status of ${res.status}, capturing cookies`);

  _addFetchResponseHeadersToCookieJar(res, amazonBaseUrl, cookieJar);

  console.log(`amazon session data cookies successfully captured for ${amazonBaseUrl}`);

  const sessionId = find(cookieJar.serializeSync().cookies, { key: 'session-id' }).value;

  const sessionData = {
    fullUrl,
    sessionId,
  };

  console.log(`gathering required data from page at ${amazonBaseUrl}`);

  const dom = new JSDOM(await res.text());
  const inputs = dom.window.document.getElementsByTagName('input');

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const name = input.name;
    const value = input.value;

    console.log(`Setting data "${name}" as "${value}"`);

    sessionData[name] = value;
  }

  console.log(`Finished with ${amazonBaseUrl}:`, sessionData);

  return sessionData;
}

async function authenticate (amazonBaseUrl, audibleBaseUrl, cookieJar, amazonSessionData, audibleSessionData) {
  console.log(`About to authenticate using ${amazonBaseUrl} using session ${amazonSessionData.sessionId}`);

  const url = `${amazonBaseUrl}ap/signin/${amazonSessionData.sessionId}`;

  const body = queryString.stringify({
    appActionToken: amazonSessionData.appActionToken,
    'openid.return_to': amazonSessionData['openid.return_to'],
    prevRID: amazonSessionData.prevRID,
    workflowState: amazonSessionData.workflowState,
    // These are also on the inputs from the login page, but we know what they
    // should be, and they're static.  If they ever change from these static
    // values, it probably means the api changed, and we need to implement
    // new authentication logic...
    appAction: 'SIGNIN',
    create: '0',
    encryptedPasswordExpected: '',
    // Need to get these from the user...
    email,
    password,
  });

  // const res = await curl(url, {
  //   headers: {
  //     ...defaultHeaders,
  //     'sec-fetch-site': 'same-origin',
  //     'content-type': 'application/x-www-form-urlencoded',
  //     authority: 'www.amazon.com',
  //     origin: 'https://www.amazon.com',
  //     referrer: _generateSignInReferralUrl(amazonBaseUrl, audibleBaseUrl, audibleSessionData),
  //     cookie: `session-id=${amazonSessionData.sessionId}`,
  //   },
  //   body,
  // });

  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    referrerPolicy: 'no-referrer-when-downgrade',
    referrer: _generateSignInReferralUrl(amazonBaseUrl, audibleBaseUrl, audibleSessionData),
    body,
    headers: {
      ...defaultHeaders,
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/x-www-form-urlencoded',
      authority: 'www.amazon.com',
      origin: 'https://www.amazon.com',
      cookie: `session-id=${amazonSessionData.sessionId}`,
      // curl uses referrer as a header, not sure if we'll ever need this...
      /* referrer: _generateSignInReferralUrl(amazonBaseUrl, audibleBaseUrl, audibleSessionData), */
    },
    // Right now, we do not need to capture the redirects.  We can allow the
    // fetch library to do that for us.
    /* redirect: 'manual', */
  });

  console.log(`Finished authenticating at ${amazonBaseUrl}, with status of ${res.status}...`);

  if (!res.status === '200') {
    throw new Error(`Unable to successfully login - got status ${res.status}`);
  }

  console.log(res)
  console.log(await res.text())
  console.log(res.headers.raw())

  _addFetchResponseHeadersToCookieJar(res, amazonBaseUrl, cookieJar);

  console.log(`authentication cookies successfully captured for ${amazonBaseUrl}`);

  const sessionId = find(cookieJar.serializeSync().cookies, { key: 'session-id' }).value;
  const ubidAcbus = find(cookieJar.serializeSync().cookies, { key: 'ubid-acbus' }).value;

  const sessionData = {
    sessionId,
    ubidAcbus,
  };

  console.log(`Finished authenticating with ${amazonBaseUrl}:`, sessionData);

  return sessionData;
}

async function main() {
  const audibleBaseUrl = 'https://www.audible.com/';
  const amazonBaseUrl = 'https://www.amazon.com/';

  const audibleCookieJar = new tough.CookieJar();
  const amazonCookieJar = new tough.CookieJar();
  const authenticatedCookieJar = new tough.CookieJar();

  console.log('---')
  const audibleSessionData = await getAudibleSessionData(audibleBaseUrl, audibleCookieJar);
  console.log('---')
  console.log('---')
  const amazonSessionData = await getAmazonSessionData(amazonBaseUrl, audibleBaseUrl, amazonCookieJar, audibleSessionData);
  console.log('---')
  console.log('---')
  const authenticationData = await authenticate(amazonBaseUrl, audibleBaseUrl, authenticatedCookieJar, amazonSessionData, audibleSessionData);
  console.log('---')

  await logout(audibleBaseUrl);

  // await fetchTitles(audibleBaseUrl, authenticatedCookieJar, authenticationData);
}

main()
  .then(() => {
    console.log('sup');
  })
  .catch((error) => {
    console.error('FAILURE');
    console.error(error);
    console.error('see FAILURE above');
  });
