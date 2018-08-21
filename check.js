/**
 * Script to check node-google-shared-locations module
 * Run: node check.js yourgmailaccount@gmail.com yourgmailpassword
 */

const gsl = require('./index');

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

console.time('running time');
gsl.getLocations().then(result => {
  console.log('ok first call (number of locations: ' + result.length + ')');
  console.timeEnd('running time');
  console.log(JSON.stringify(result));
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.time('running time');
      resolve(gsl.getLocations());
    }, 10000);
  });
}).then(result => {
  console.log('second call (number of locations: ' + result.length + ')');
  console.timeEnd('running time');
  console.log(JSON.stringify(result));
}).catch(failure => {
  console.error(failure);
});