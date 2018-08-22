const gsl = require('./../index');

// avoid long error logs
beforeEach(() => {
  // console.log = jest.fn();
});

test('has default empty credentials', () => {
  expect(gsl.credentials.username).toBe('');
  expect(gsl.credentials.password).toBe('');
});

test('bad account login should end with an error in the stage 2', async () => {
  gsl.credentials = {
    username: 'abcde@domain.com',
    password: 'wrong password'
  }
  expect.assertions(1);
  try {
    await gsl.authenticate();
  } catch (e) {
    // console.log(e, 'ZACHYTENA CHYBA');
    expect(e.message).toMatch(/Stage 2 data error:.*/);
  }

  // try {
  //   gsl.authenticate().then()
  //   .catch(error => {
  //     expect(error.message).rejects.toMatch(/Stage \d data error:.*/);
  //   })
  // } catch (e) { }

  // await expect(gsl.authenticate()).rejects.message.toMatch(/Stagex 2 data error:.*/);

  // gsl.authenticate().catch(error => {
  //   console.log(error);
  //   console.log(error.message);
  //   expect(error.message).toMatch(/Stagex 2 data error:.*/);
  // });
});

test('bad account password should end with an error in the stage 3', async () => {
  gsl.credentials = {
    username: 'testtest@gmail.com',
    password: 'wrong password'
  }

  expect.assertions(1);
  try {
    await gsl.authenticate();
  } catch (e) {
    expect(e.message).toMatch(/Stage 3 data error:.*/);
  }

  // try {
  //   gsl.authenticate().then()
  //     .catch(error => {
  //       expect(error.message).rejects.toMatch(/Stage \d data error:.*/);
  //     })
  // } catch (e) {}
});