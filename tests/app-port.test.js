describe('PORT fallback', () => {
  const originalPort = process.env.PORT;

  afterEach(() => {
    process.env.PORT = originalPort;
    jest.dontMock('dotenv');
    jest.resetModules();
  });

  it('falls back to 8080 when PORT is not set in the environment', () => {
    delete process.env.PORT;
    jest.doMock('dotenv', () => ({ config: () => {} }));
    jest.resetModules();

    expect(() => require('../src/app')).not.toThrow();
  });
});
