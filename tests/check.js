/**
 * Script to check node-google-shared-locations module
 * Run: node check.js yourgmailaccount@gmail.com yourgmailpassword
 */

const gsl = require('./../index');

if (process.argv.length < 4) {
  console.error('Please enter your Google Account login. Example: node check.js yourgmailaccount@gmail.com yourgmailpassword');
  return;
} else {
  process.argv.shift();
  process.argv.shift();
}

const username = process.argv[0];
process.argv.shift();
const password = process.argv.join(' ');

gsl.credentials = {
  username: username,
  password: password,
}

console.time('Running time');
gsl.getLocations().then(result => {
  return Promise.resolve(result);
}, fail => {
  if (fail.message === 'Possible 2FA') {
    console.log('I\'m waiting for 15 seconds to confirm the two-factor login to mobile and I\'ll continue');
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(gsl.getLocations(true));
      }, 15000);
    });
  } else {
    return Promise.reject(fail);
  }
}).then(result => {
  console.log('Result: ok');
  console.timeEnd('Running time');
  console.log('Response (number of locations: ' + result.length + '):')
  console.log(JSON.stringify(result));
}).catch(error => {
  console.log('Result: error');
  console.timeEnd('Running time');
  console.log(error.message);
});

/*

console.time('Running time');
gsl.getLocations().then(result => {
  console.log('First call: ok');
  console.timeEnd('Running time');
  console.log('Response (number of locations: ' + result.length + '):')
  console.log(JSON.stringify(result));
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.time('Running time');
      resolve(gsl.getLocations());
    }, 5000);
  });
}).then(result => {
  console.log('\nSecond call: ok');
  console.timeEnd('Running time');
  console.log('Response (number of locations: ' + result.length + '):')
  console.log(JSON.stringify(result));
}).catch(failure => {
  console.log('\ngetLocation call: error');
  console.error(failure);
});
-- */