const gsl = require('./../index');

test('has default empty credentials', () => {
  expect(gsl.credentials.username).toBe('');
  expect(gsl.credentials.password).toBe('');
});

test('bad account login should end with an error in the stage 2', async () => {
  gsl.credentials = {
    username: 'abcde@domain.com',
    password: 'wrong password'
  }
  gsl.authenticate().catch(error => {
    expect(error.message).toMatch(/Stage 2 data error:.*/);
  });
});

test('bad account password should end with an error in the stage 3', async () => {
  gsl.credentials = {
    username: 'testtest@gmail.com',
    password: 'wrong password'
  }
  gsl.authenticate().catch(error => {
    expect(error.message).toMatch(/Stage 3 data error:.*/);
  });
});