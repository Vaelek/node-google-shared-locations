const gsl = require('./../index');
const fs = require('fs');

let credentials = {
  username: 'wrong@email',
  password: 'wrongPassword'
};

test('credentials file exists', () => {
  try {
    expect(fs.existsSync('./tests/credentials.json')).toBeTruthy();
  } catch (e) {
    console.warn('Missing credentials file');
    console.log('Please create credentials.json file in tests directory with content:\n' +
      '{"username": "googleAccountEmail", "password": "googleAccountPassword"}\n' +
      'To test with real account.');
  }
});

test('credentials file contains data about google account', () => {
  credentials = JSON.parse(fs.readFileSync('./tests/credentials.json', 'utf8'));
  expect(credentials.username).not.toBe('wrong@email');
  expect(credentials.password).not.toBe('wrongPassword');
  expect(credentials.username).not.toBe('');
  expect(credentials.password).not.toBe('');
});