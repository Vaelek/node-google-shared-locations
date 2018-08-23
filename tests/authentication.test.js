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

test('has default empty credentials', () => {
  expect(gsl.credentials.username).toBe('');
  expect(gsl.credentials.password).toBe('');
});

test('bad account login should end with an error in the stage 2', async () => {
  gsl.credentials = {
    username: 'wrong@email',
    password: 'wrongPassword'
  }
  expect.assertions(1);
  try {
    await gsl.authenticate();
  } catch (e) {
    expect(e.message).toMatch(/Stage 2 data error:.*/);
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
