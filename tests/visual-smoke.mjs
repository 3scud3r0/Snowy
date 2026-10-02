import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const out = new URL('../qa/', import.meta.url);
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl']
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

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__snowy && window.__snowy.renderer);
await page.screenshot({ path: new URL('01-start.png', out).pathname });

await page.click('#start');
await page.waitForFunction(() => document.body.classList.contains('playing'));
await page.waitForFunction(() => window.__snowy?.rider?.loaded === true, null, { timeout: 20000 });

const riderStatus = await page.evaluate(() => ({
  loaded: window.__snowy.rider.loaded,
  boneCount: window.__snowy.rider.bones?.size ?? 0,
  childCount: window.__snowy.rider.model?.children?.length ?? 0,
  renderer: window.__snowy.renderer.info.render,
  startZ: window.__snowy.state.z
}));

if (!riderStatus.loaded || riderStatus.boneCount < 10) {
  throw new Error(`Rigged rider did not initialize correctly: ${JSON.stringify(riderStatus)}`);
}

await page.waitForTimeout(3000);
await page.screenshot({ path: new URL('02-gameplay.png', out).pathname });

await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1400);
await page.keyboard.up('ArrowLeft');
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(1800);
await page.keyboard.up('ShiftLeft');
await page.screenshot({ path: new URL('03-carve-speed.png', out).pathname });

await page.keyboard.press('Space');
await page.waitForTimeout(450);
await page.screenshot({ path: new URL('04-airborne.png', out).pathname });

const endStatus = await page.evaluate(() => ({
  z: window.__snowy.state.z,
  speed: window.__snowy.state.speed,
  flow: window.__snowy.state.flow,
  riderLoaded: window.__snowy.rider.loaded,
  drawCalls: window.__snowy.renderer.info.render.calls,
  triangles: window.__snowy.renderer.info.render.triangles
}));

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

console.log(JSON.stringify({ riderStatus, endStatus }, null, 2));
await browser.close();
