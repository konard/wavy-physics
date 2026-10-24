/* global document, window */
// Capture every tab of the built site (examples/universal-app/dist) at
// desktop and phone sizes in both themes. Usage:
//   npm run example:web:build && node experiments/screenshot-tabs.mjs
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const DIST = 'examples/universal-app/dist';
const OUT = 'docs/screenshots/tabs';
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};
const TABS = (
  process.env.TABS ?? 'atom,orbit,light,matter,fractal,validation,hypothesis'
).split(',');
const VIEWPORTS = {
  desktop: { width: 1366, height: 900 },
  phone: { width: 390, height: 844 },
};

const server = createServer(async (request, response) => {
  const path = normalize(new globalThis.URL(request.url, 'http://x').pathname);
  const file = join(DIST, path.endsWith('/') ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport,
      colorScheme: theme,
      deviceScaleFactor: device === 'phone' ? 2 : 1,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) =>
      errors.push(`${device}/${theme}: ${error.message}`)
    );
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`${device}/${theme}: ${message.text()}`);
      }
    });
    for (const tab of TABS) {
      await page.goto(`${base}#${tab}`);
      await page.waitForSelector('#app-title');
      await page.waitForTimeout(tab === 'validation' ? 9000 : 3500);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      if (overflow > 0) {
        errors.push(
          `${device}/${theme}/${tab}: horizontal overflow ${overflow}px`
        );
      }
      await page.screenshot({
        path: `${OUT}/${tab}-${device}-${theme}.png`,
        fullPage: device === 'desktop',
      });
    }
    await context.close();
  }
}
await browser.close();
server.close();
console.log(
  errors.length ? errors.join('\n') : 'no page errors, no horizontal overflow'
);
