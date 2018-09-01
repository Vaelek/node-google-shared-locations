/**
 * Script to check node-google-shared-locations module.
 * Usage:
 *     node check.js <googleAccountEmail> <googleAccountPassword>
 *   # Save cookies and use it for next call
 *     node check.js <googleAccountEmail> <googleAccountPassword> --save-cookies
 *     node check.js <googleAccountEmail> --load-cookies --save-cookies
 *   # How to use
 *     node check.js --help
 * 
 * Options:
 *   --load-cookies     Load saved cookies for googleAccountEmail, googleAccountPassword will be ignored if cookies exists.
 *   --save-cookies     Save cookies for googleAccountEmail.
 *   --clear-cookies    Clear saved cookies for googleAccountEmail.
 */

const gsl = require('./../index');
const storage = require('node-persist');

async function check() {
  // ignore node and this script name
  process.argv.shift();
  process.argv.shift();

  // script parameters
  const parameters = ' ' + process.argv.join(' ') + ' ';
  const help = parameters.indexOf(' --help ') >= 0 || process.argv.length === 0;

  if (help) {
    console.log('Script to check node-google-shared-locations module.\n');
    console.log('Usage:');
    console.log('  # One time check of locations for selected account and password');
    console.log('    node check.js <googleAccountEmail> <googleAccountPassword>');
    console.log('  # Save cookies and use it for next call');
    console.log('    node check.js <googleAccountEmail> <googleAccountPassword> --save-cookies');
    console.log('    node check.js <googleAccountEmail> --load-cookies --save-cookies');
    console.log('  # Clear cookies for selected account');
    console.log('    node check.js <googleAccountEmail> --clear-cookies');
    console.log('  # Clear all cookies');
    console.log('    node check.js --clear\n');
    console.log('Options:');
    console.log('  --load-cookies     Load saved cookies for googleAccountEmail, googleAccountPassword will be ignored if cookies exists.');
    console.log('  --save-cookies     Save cookies for googleAccountEmail.');
    console.log('  --clear-cookies    Clear saved cookies for googleAccountEmail.');
    console.log('  --debug            Log with step informations on errors.');
    console.log('  --clear            Clear all cookies.');
    return;
  }

  const clear = parameters.indexOf(' --clear ') >= 0;
  const clearCookies = parameters.indexOf(' --clear-cookies ') >= 0;
  const loadCookies = parameters.indexOf(' --load-cookies ') >= 0;
  const saveCookies = parameters.indexOf(' --save-cookies ') >= 0;
  const debug = parameters.indexOf(' --debug ') >= 0;

  if (clear || clearCookies || loadCookies || saveCookies) {
    await storage.init();
  }

  if (clear) {
    await storage.clear();
    console.log('OK, all cleaned.');
    return;
  }

  const username = (process.argv.length >= 1 && !process.argv[0].startsWith('--') ? process.argv[0] : '');

  if (clearCookies) {
    const keys = await storage.keys()
    const keyExists = keys.indexOf('cookies' + '_' + username) >= 0;
    if (username.length > 0 && keyExists) {
      await storage.removeItem('cookies' + '_' + username);
      console.log('OK, cookies for "' + username + '" cleared.');
    } else {
      console.log('No cookies for "' + username + '" found.');
    }
    return;
  }

  if (username.length === 0) {
    console.log('Missing username. Run: "node check.js --help" to see all options.');
    return;
  }

  const password = process.argv.length >= 2 && !process.argv[0].startsWith('--') &&
    !process.argv[1].startsWith('--clear') &&
    !process.argv[1].startsWith('--load-cookies') &&
    !process.argv[1].startsWith('--save-cookies') &&
    !process.argv[1].startsWith('--debug') ? process.argv[1] : '';

  if (password.length === 0 && !loadCookies) {
    console.log('Missing password or --load-cookies option.');
    return;
  }

  gsl.googleEmail = username;
  gsl.googlePassword = password;

  if (loadCookies) {
    const cookies = await storage.getItem('cookies' + '_' + username);
    if (cookies) {
      gsl.cookies = cookies;
      console.log('Input cookies (load for "' + username + '"):\n' + JSON.stringify(cookies) + '\n');
    } else {
      console.warn('Cookies loading failed! Saved cookies for "' + username + '" not found.');
      if (password.length === 0) {
        console.log('Missing password and cookies. Aborting.');
        return;
      }
    }
  }

  gsl.debug = debug;
  console.time('Running time');
  gsl.getLocations().then(result => {
    return Promise.resolve(result);
  }).catch(error => {
    if (error.message === 'Cell phone verification') {
      console.timeEnd('Running time');
      console.log('\nWaiting 30 seconds for cell phone verification. Please answer "Yes" on your phone.');
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.time('Running time');
          resolve(gsl.getLocations());
        }, 30000);
      });
    }
    return Promise.reject(error);
  }).then(async result => {
    console.log('1. call result: ok');
    console.timeEnd('Running time');
    console.log('Response (number of locations: ' + result.length + '):');
    console.log(JSON.stringify(result));
    console.log('Wait 5 seconds for next automatic call to check cookies remembering.');

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.time('Running time');
        resolve(gsl.getLocations());
      }, 5000);
    });
  }).then(async result => {
    console.log('\n2. call result: ok');
    console.timeEnd('Running time');
    console.log('Response (number of locations: ' + result.length + '):')
    console.log(JSON.stringify(result));

    // Cookies info
    console.log('\nOutput cookies' + (saveCookies ? ' (saved for "' + username + '")' : '') + ':\n' + JSON.stringify(gsl.cookies));
    if (saveCookies) {
      await storage.setItem('cookies' + '_' + username, gsl.cookies);
    }
  }).catch(error => {
    console.log('Result: error');
    console.timeEnd('Running time');
    console.log(error.message);
  });
}

check();