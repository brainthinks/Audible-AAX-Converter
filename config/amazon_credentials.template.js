'use strict';

/**
 * Copy this file:
 *
 * ```bash
 * cp amazon_credentials.template.js amazon_credentials.js
 * ```
 *
 * Then in the new `amazon_credentials.js`, supply the values for your
 * Amazon email and password.
 *
 * The `amazon_credentials.js` file is currently used by the scripts that
 * retrieves your activation bytes.  If you do not supply these values in
 * `amazon_credentials.js`, you will be prompted to type them when they are
 * needed by the script.
 */

module.exports = {
  email: '',
  password: '',
};
