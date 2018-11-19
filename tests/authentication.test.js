const gsl = require('./../index');
const fs = require('fs');

let credentials = {
  username: 'wrong@email',
  password: 'wrongPassword'
};

beforeAll(() => {
  try {
    credentials = JSON.parse(fs.readFileSync('./tests/credentials.json', 'utf8'));
  } catch (e) {}
});

test('googleEmail can not be read', () => {
  expect(() => {
    return gsl.googleEmail === '';
  }).toThrow();
});

test('googlePassword can not be read', () => {
  expect(() => {
    return gsl.googlePassword === '';
  }).toThrow();
});

test('is not authenticated by default', () => {
  expect(gsl.authenticated).toBeFalsy();
});

test('bad account login should end with "Error on webpage"', async () => {
  gsl.googleEmail = 'wrong@gmail.com';
  gsl.googlePassword = 'wrongPassword';
  expect.assertions(1);
  try {
    await gsl.authenticate();
  } catch (e) {
    expect(e.message).toMatch('Error on webpage');
  }
});
