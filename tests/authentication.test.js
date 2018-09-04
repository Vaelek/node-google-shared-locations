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

test('bad account password should end with "Error on webpage"', async () => {
  gsl.googleEmail = credentials.username;
  gsl.googlePassword = 'wrongPassword';
  expect.assertions(1);
  try {
    await gsl.authenticate();
  } catch (e) {
    expect(e.message).toMatch('Error on webpage');
  }
});

test('bad account password should end with an error in the stage 3', async () => {
  gsl.credentials = {
    username: credentials.username,
    password: 'wrongPassword'
  }
  expect.assertions(1);
  try {
    await gsl.authenticate();
  } catch (e) {
    expect(e.message).toMatch(/Stage 3 data error:.*/);
  }
});

test('get shared location without authentication end in the stage', async () => {
  gsl.AUTHENTICATED = false;
  expect.assertions(1);
  try {
    await gsl.getLocations();
    expect(gsl.lastSharedLocation).toBeNull();
  } catch (e) {
    console.log(e);
  }
});

test('real username and password will allow authentication', async () => {
  gsl.credentials = {
    username: credentials.username,
    password: credentials.password
  }
  expect.assertions(1);
  try {
    await gsl.authenticate();
    expect(gsl.AUTHENTICATED).toBeTruthy();
  } catch (e) {}
});