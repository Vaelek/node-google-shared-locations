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

test('get shared location return object', async () => {
  gsl.googleEmail = credentials.username;
  gsl.googlePassword = credentials.password;
  data = await gsl.getLocations();
  expect(data).toBeDefined();
  expect(data != null).toBeTruthy();
});
