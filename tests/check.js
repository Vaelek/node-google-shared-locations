/**
 * Script to check node-google-shared-locations module.
 * Usage:
 *     node check.js <googleAccountEmail> <googleAccountPassword>
 *   # Save cookies and use it for next call
 *     node check.js <googleAccountEmail> <googleAccountPassword> --save
 *     node check.js <googleAccountEmail> --load --save
 *   # How to use
 *     node check.js --help
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
    console.log('Script to check node-google-shared-locations module.');
    console.log('This script first authenticates the user, then downloads the location data, and then downloads the location data without re-authentication, using only cookies..');
    console.log('Usage:');
    console.log('  # One time check of locations for selected account and password');
    console.log('    node check.js <googleAccountEmail> <googleAccountPassword>');
    console.log('  # Save cookies and use it for next call');
    console.log('    node check.js <googleAccountEmail> <googleAccountPassword> --save');
    console.log('    node check.js <googleAccountEmail> --load --save');
    console.log('  # Clear cookies for selected account');
    console.log('    node check.js <googleAccountEmail> --clear');
    console.log('  # Clear all cookies');
    console.log('    node check.js --clear-all\n');
    console.log('Options:');
    console.log('  --load        Load user credentials, googleAccountPassword will be ignored if cookies exists.');
    console.log('  --save        Save user credentials (user account name and cookies).');
    console.log('  --clear       Clear saved data for selected user account.');
    console.log('  --clear-all   Clear all cookies.');
    console.log('  --one         Only one fetch for location data.');
    console.log('  --debug       Log with step informations on errors.');
    return;
  }

  const clearAll = parameters.indexOf(' --clear-all ') >= 0;
  const clear = parameters.indexOf(' --clear ') >= 0;
  const load = parameters.indexOf(' --load ') >= 0;
  const save = parameters.indexOf(' --save ') >= 0;
  const debug = parameters.indexOf(' --debug ') >= 0;

  if (clearAll || clear || load || save) {
    await storage.init();
  }

  if (clearAll) {
    await storage.clear();
    console.log('OK, all cleaned.');
    return;
  }

  const username = (process.argv.length >= 1 && !process.argv[0].startsWith('--') ? process.argv[0] : '');

  if (clear) {
    const keys = await storage.keys()
    const keyExists = keys.indexOf('cookies' + '_' + username) >= 0;
    if (username.length > 0 && keyExists) {
      await storage.removeItem('credentials' + '_' + username);
      console.log('OK, credentials for "' + username + '" cleared.');
    } else {
      console.log('No credentials for "' + username + '" found.');
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

  if (password.length === 0 && !load) {
    console.log('Missing password or --load option.');
    return;
  }

  gsl.googleEmail = username;
  gsl.googlePassword = password;

  if (load) {
    const credentials = await storage.getItem('credentials' + '_' + username);
    if (credentials) {
      gsl.credentials = credentials;
      console.log('Credentials loaded for "' + username + '":\n' + JSON.stringify(credentials) + '\n');
    } else {
      console.warn('Credentials loading failed! No credentials for "' + username + '" found.');
      if (password.length === 0) {
        console.log('Missing password. Aborting.');
        return;
      }
    }
  }

  // enable debugging
  gsl.debug = debug;
  // alow request each 1 second
  gsl.minimalRequestTimeInterval = 1;
  console.time('Running time');
  // get location
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
    console.log('Wait 5 seconds for next automatic call to check credentials remembering.');

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

    console.log('\nCredentials' + (save ? ' saved' : '') + ' for "' + username + '":\n' + JSON.stringify(gsl.credentials));
    if (save) {
      await storage.setItem('credentials' + '_' + username, gsl.credentials);
    }
  }).catch(error => {
    console.log('Result: error');
    console.timeEnd('Running time');
    console.log(error.message);
  });
}

check();