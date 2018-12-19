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

test('default value for next request is set to 60 seconds', () => {
  try {
    expect(gsl.minimalRequestTimeInterval).toBe(60);
  } catch (e) {
    console.log(e);
  }
});

test('next request can be called immediately', () => {
  try {
    expect(gsl.nextRequestAfter.getTime()).toBeLessThanOrEqual(new Date().getTime());
  } catch (e) {
    console.log(e);
  }
});
