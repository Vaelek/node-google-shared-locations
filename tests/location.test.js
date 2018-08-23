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

test('get shared location without authentication return reject "Not authenticated"', async () => {
  gsl.AUTHENTICATED = false;
  expect.assertions(1);
  try {
    gsl.getLocations().then().catch(error => {
      console.log(error, 'getLocations Error');
    })
    // expect(gsl.lastSharedLocation).toBeNull();
  } catch (e) {
    console.log(e);
  }
});
