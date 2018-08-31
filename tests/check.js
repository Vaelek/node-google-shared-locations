/**
 * Script to check node-google-shared-locations module.
 * If you use --load-cookies, googleAccountEmail and googleAccountPassword will not be taken into account.
 * Run: node check.js (<googleAccountEmail> <googleAccountPassword> | --load-cookies | --clear-cookies) [--save-cookies] [--debuging]
 */

const gsl = require('./../index');
const storage = require('node-persist');

async function check() {
  if (process.argv.length < 3) {
    console.error('Please enter your Google Account login and password. Example: node check.js (<googleAccountEmail> <googleAccountPassword> | [--load-cookies]) [--save-cookies] [--debuging]');
    return;
  } else {
    process.argv.shift();
    process.argv.shift();
  }

  // script parameters
  const parameters = process.argv.join(' ');
  const clearCookies = parameters.indexOf('--clear-cookies') >= 0;
  const loadCookies = parameters.indexOf('--load-cookies') >= 0;
  const saveCookies = parameters.indexOf('--save-cookies') >= 0;
  const debuging = parameters.indexOf('--debuging') >= 0;

  if (clearCookies || loadCookies || saveCookies) {
    await storage.init();
  }

  if (clearCookies) {
    await storage.removeItem('cookies');
    console.log('OK, cookies cleared.');
    return;
  }

  const username = (process.argv.length >= 2 && !process.argv[0].startsWith('--') ? process.argv[0] : '');
  const password = (process.argv.length >= 2 && !process.argv[0].startsWith('--') ? process.argv[1] : '');

  gsl.credentials = {
    username: username,
    password: password,
  }

  if (loadCookies) {
    const cookies = await storage.getItem('cookies');
    if (cookies) {
      gsl.cookies = cookies;
      gsl.authenticated = true;
      console.log('Input cookies set to:\n' + JSON.stringify(cookies) + '\n');
    } else {
      console.warn('Cookies loading failed! Saved cookies not found.');
    }
  }

  gsl.debuging = debuging;
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
          resolve(gsl.getLocations(true));
        }, 30000);
      });
    }
    return Promise.reject(error);
  }).then(async result => {
    console.log('Result: ok');
    console.timeEnd('Running time');
    console.log('Response (number of locations: ' + result.length + '):')
    console.log(JSON.stringify(result));

    // Cookies info
    console.log('\nOutput cookies' + (saveCookies ? ' (saved)' : '') + ':\n' + JSON.stringify(gsl.cookies));
    if (saveCookies) {
      await storage.setItem('cookies', gsl.cookies);
    }
  }).catch(error => {
    console.log('Result: error');
    console.timeEnd('Running time');
    console.log(error.message);
  });
}

check();