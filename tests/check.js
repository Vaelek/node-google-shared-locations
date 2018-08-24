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