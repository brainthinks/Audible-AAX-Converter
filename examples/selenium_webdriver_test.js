'use strict';

/**
 * A simple script adapted from MDN and the Selenium docs to give me some
 * exposure to selenium.  I ended up needing it because I was unable to
 * successfully authenticate with curl.
 *
 * @see - https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Your_own_automation_environment
 * @see - https://www.selenium.dev/selenium/docs/api/javascript/index.html
 */

const { Builder, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

let driver;

async function main() {
  const options = new firefox.Options();

  // If you want to see firefox, you can remove this line
  options.addArguments("-headless");

  driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  // Navigate
  await driver.get('https://www.google.com');

  // Wait for the page to load the element we want to interact with
  const searchBox = await driver.wait(until.elementLocated(By.name('q')), 1000);

  console.log('Page loaded...');

  // Enter some text in search input
  await searchBox.sendKeys('webdriver');

  // We have to press escape to button interactable, otherwise we will
  // get an `ElementNotInteractableError`
  await searchBox.sendKeys(Key.ESCAPE);

  // @todo - what condition could we explicitly check for here?
  await driver.sleep(500);

  // Click the button to search
  const button = await driver.findElement(By.name('btnK'));
  /* await driver.executeScript("arguments[0].scrollIntoView()", button); */
  await button.click();

  // Wait for the page to load/change, then check the title
  await driver.wait(until.titleIs('webdriver - Google Search'), 2000);

  console.log('Title updated!');

  await driver.quit();
}

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
  console.error('Test failed!  See error message(s) above.');
  process.exit(1);
});
