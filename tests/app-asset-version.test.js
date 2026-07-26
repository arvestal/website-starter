describe('asset version', () => {
  const original = process.env.RAILWAY_GIT_COMMIT_SHA;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
    } else {
      process.env.RAILWAY_GIT_COMMIT_SHA = original;
    }
    jest.dontMock('dotenv');
    jest.resetModules();
  });

  it('cache-busts the stylesheet with RAILWAY_GIT_COMMIT_SHA when Railway sets it', async () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'abc123';
    jest.doMock('dotenv', () => ({ config: () => {} }));
    jest.resetModules();

    const request = require('supertest');
    const app = require('../src/app');
    const res = await request(app).get('/');
    expect(res.text).toContain('/css/main.css?v=abc123');
  });
});
