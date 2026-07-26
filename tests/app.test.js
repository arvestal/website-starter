const request = require('supertest');
const app = require('../src/app');

describe('GET /', () => {
  it('renders the landing page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Site Name');
  });

  it('omits the canonical link when SITE_HOST is unset', async () => {
    const res = await request(app).get('/');
    expect(res.text).not.toContain('rel="canonical"');
  });

  it('falls back to a "dev" cache-busting version when RAILWAY_GIT_COMMIT_SHA is unset', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('/css/main.css?v=dev');
  });
});

describe('GET /health', () => {
  it('reports ok for the Railway healthcheck', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('www redirect (SITE_HOST unset)', () => {
  it('does not redirect since there is no configured site host to compare against', async () => {
    const res = await request(app).get('/').set('Host', 'www.example.com');
    expect(res.status).toBe(200);
  });
});

describe('unmatched routes', () => {
  it('404s with the generic error page', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Page Not Found');
  });
});

describe('static assets', () => {
  it('serves the stylesheet from public/', async () => {
    const res = await request(app).get('/css/main.css');
    expect(res.status).toBe(200);
  });
});

describe('with SITE_HOST configured', () => {
  const originalHost = process.env.SITE_HOST;

  afterEach(() => {
    if (originalHost === undefined) delete process.env.SITE_HOST;
    else process.env.SITE_HOST = originalHost;
    jest.dontMock('dotenv');
    jest.resetModules();
  });

  it('redirects www to the bare domain', async () => {
    process.env.SITE_HOST = 'example.com';
    jest.doMock('dotenv', () => ({ config: () => {} }));
    jest.resetModules();
    const freshApp = require('../src/app');
    const res = await request(freshApp).get('/some/path').set('Host', 'www.example.com');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('https://example.com/some/path');
  });

  it('does not redirect the bare host, and renders a canonical link', async () => {
    process.env.SITE_HOST = 'example.com';
    jest.doMock('dotenv', () => ({ config: () => {} }));
    jest.resetModules();
    const freshApp = require('../src/app');
    const res = await request(freshApp).get('/').set('Host', 'example.com');
    expect(res.status).toBe(200);
    expect(res.text).toContain('rel="canonical" href="https://example.com/"');
  });
});
