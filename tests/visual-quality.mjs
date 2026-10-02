import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const out = new URL('../qa/', import.meta.url);
await mkdir(out,{recursive:true});

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless:false,
  args:['--ignore-gpu-blocklist','--enable-webgl','--disable-dev-shm-usage']
});

const page = await browser.newPage({
  viewport:{width:960,height:540},
  deviceScaleFactor:1
});

const errors=[];
page.on('pageerror',e=>errors.push(String(e)));

try {
  await page.goto('http://127.0.0.1:4173/?qa=full',{
    waitUntil:'domcontentloaded',
    timeout:30000
  });

  await page.waitForFunction(()=>window.__snowy?.renderer && window.__snowy?.post,null,{timeout:20000});
  await page.click('#start');
  await page.waitForFunction(()=>window.__snowy?.rider?.loaded === true,null,{timeout:20000});

  await page.waitForTimeout(900);
  await page.evaluate(()=>{
    window.__snowy.state.speed = Math.max(window.__snowy.state.speed,52);
  });
  await page.waitForTimeout(700);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(850);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(650);
  await page.keyboard.up('ShiftLeft');

  await page.screenshot({
    path:new URL('05-quality-shadows-bloom.png',out).pathname
  });

  const status=await page.evaluate(()=>({
    riderLoaded:window.__snowy.rider.loaded,
    shadows:window.__snowy.renderer.shadowMap.enabled,
    post:Boolean(window.__snowy.post),
    speed:window.__snowy.state.speed,
    z:window.__snowy.state.z,
    calls:window.__snowy.renderer.info.render.calls,
    triangles:window.__snowy.renderer.info.render.triangles
  }));

  console.log(JSON.stringify(status,null,2));

  if (!status.riderLoaded || !status.shadows || !status.post) {
    throw new Error(`Full-quality QA path not active: ${JSON.stringify(status)}`);
  }
  if (errors.length) throw new Error(`Page errors: ${errors.join(' | ')}`);
} finally {
  await browser.close();
}
