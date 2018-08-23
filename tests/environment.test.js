const gsl = require('./../index');
const fs = require('fs');

let credentials = {
  username: 'wrong@email',
  password: 'wrongPassword'
};

beforeAll(() => {
  try {
    credentials = JSON.parse(fs.readFileSync('./tests/credentials.json', 'utf8'));
  } catch (e) {
    console.warn('Missing credentials file');
    console.log('Please create credentials.json file in tests directory with content:');
    console.log('{"username": "YOURGOOGLEACCOUNT@gmail.com", "password": "YOURPASSWORD"}');
  }
});

test('credentials file is created', () => {
  expect.assertions(2);
  expect(credentials.username).not.toBe('wrong@email');
  expect(credentials.password).not.toBe('wrongPassword');
});
