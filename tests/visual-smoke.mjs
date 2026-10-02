import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const out = new URL('../qa/', import.meta.url);
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: false,
  args: [
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--use-gl=egl',
    '--disable-dev-shm-usage'
  ]
});

const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1
});

const pageErrors = [];
const consoleErrors = [];

page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__snowy && window.__snowy.renderer, null, { timeout: 15000 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: new URL('01-start.png', out).pathname });

  await page.click('#start');
  await page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 5000 });

  let riderLoaded = false;
  try {
    await page.waitForFunction(() => window.__snowy?.rider?.loaded === true, null, { timeout: 15000 });
    riderLoaded = true;
  } catch {
    await page.screenshot({ path: new URL('00-rider-load-failure.png', out).pathname });
  }

  const riderStatus = await page.evaluate(() => ({
    loaded: window.__snowy?.rider?.loaded ?? false,
    boneCount: window.__snowy?.rider?.bones?.size ?? 0,
    childCount: window.__snowy?.rider?.model?.children?.length ?? 0,
    hasModel: Boolean(window.__snowy?.rider?.model),
    startZ: window.__snowy?.state?.z ?? null,
    drawCalls: window.__snowy?.renderer?.info?.render?.calls ?? null,
    triangles: window.__snowy?.renderer?.info?.render?.triangles ?? null
  }));

  await page.waitForTimeout(2400);
  await page.screenshot({ path: new URL('02-gameplay.png', out).pathname });

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(1300);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(1700);
  await page.keyboard.up('ShiftLeft');
  await page.screenshot({ path: new URL('03-carve-speed.png', out).pathname });

  await page.keyboard.press('Space');
  await page.waitForTimeout(420);
  await page.screenshot({ path: new URL('04-airborne.png', out).pathname });

  const endStatus = await page.evaluate(() => ({
    z: window.__snowy?.state?.z ?? null,
    speed: window.__snowy?.state?.speed ?? null,
    flow: window.__snowy?.state?.flow ?? null,
    riderLoaded: window.__snowy?.rider?.loaded ?? false,
    drawCalls: window.__snowy?.renderer?.info?.render?.calls ?? null,
    triangles: window.__snowy?.renderer?.info?.render?.triangles ?? null
  }));

  console.log(JSON.stringify({ riderStatus, endStatus, pageErrors, consoleErrors }, null, 2));

  if (!riderLoaded || !riderStatus.loaded || riderStatus.boneCount < 10) {
    throw new Error(`Rigged rider did not initialize correctly: ${JSON.stringify(riderStatus)}`);
  }
  if (!(endStatus.z < riderStatus.startZ - 20)) {
    throw new Error(`Rider did not move downhill: ${JSON.stringify(endStatus)}`);
  }
  if (!(endStatus.speed > 5)) {
    throw new Error(`Rider did not accelerate: ${JSON.stringify(endStatus)}`);
  }
  if (pageErrors.length) {
    throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  }
  if (consoleErrors.length) {
    throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
}
