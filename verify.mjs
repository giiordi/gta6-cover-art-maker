import assert from 'node:assert/strict';
import { readFile, rename, rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
const origin = 'http://studio.test';
const policy = process.env.CHROMIUM_WEBGL_POLICY;
const args = policy ? [
  '--hatch-webgl-allowed-domains-file=' + resolve(policy),
  '--hatch-webgl-allowed-domains-sha256=' + createHash('sha256').update(await readFile(policy)).digest('hex'),
  '--disable-crashpad-for-testing',
] : [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args });
const staging = resolve('.verify-shots');
try {
  await mkdir(staging, { recursive: true });
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, acceptDownloads:true });
  const unexpected = [], pageErrors = [];
  const files = {
    '/':'index.html', '/style.css':'style.css', '/src/main.js':'src/main.js',
    '/src/cover.js':'src/cover.js', '/src/shots.js':'src/shots.js',
    '/fonts/Studio.woff2':'fonts/Studio.woff2', '/fonts/Cover.woff2':'fonts/Cover.woff2',
  };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !Object.hasOwn(files,url.pathname)) {
      unexpected.push(url.href);
      return route.abort();
    }
    await route.fulfill({ path:resolve('app',files[url.pathname]) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await context.setOffline(true);
  await page.goto(origin);
  await page.evaluate(async () => { await document.fonts.ready; });
  assert.equal(await page.evaluate(() => [...document.fonts].filter(f=>f.status==='loaded').length),2);
  assert.deepEqual(await page.locator('header button').allTextContents(),['New','Choose your photo','Export PNG']);
  const button = label => page.getByRole('button',{name:label,exact:true});
  const choose = page.waitForEvent('filechooser');
  await button('Choose your photo').click();
  await (await choose).setFiles('app/samples/boulevard.jpg');
  await page.getByText('boulevard.jpg',{exact:true}).waitFor();
  await button('Comic Panels').click();
  await button('Neon Night').click();
  await page.locator('#caption').fill('Last light. First getaway.');
  await page.locator('#title').fill('SUNSET HEIST');

  async function exportPNG(label,width,height){
    await button(label).click();
    const download = page.waitForEvent('download');
    await button('Export PNG').click();
    const path = resolve(staging,width+'x'+height+'.png');
    await (await download).saveAs(path);
    const data = await readFile(path);
    assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(data.readUInt32BE(16),width);
    assert.equal(data.readUInt32BE(20),height);
    return data;
  }
  async function showCover(data,name,w,h){
    const image = await context.newPage({viewport:{width:w,height:h}});
    await image.setViewportSize({width:w,height:h});
    await image.setContent('<style>body{margin:0}img{width:100vw;height:100vh;display:block}</style><img>');
    await image.locator('img').evaluate(async (img,uri)=>{img.src=uri;await img.decode();},
      'data:image/png;base64,'+data.toString('base64'));
    await image.screenshot({path:resolve(staging,name),quality:84});
    await image.close();
  }
  const landscape = await exportPNG('16:9',1920,1080);
  await showCover(landscape,'1-cover.jpg',1280,720);
  await page.screenshot({path:resolve(staging,'2-editor.jpg'),quality:82});
  const portrait = await exportPNG('4:5',1080,1350);
  await showCover(portrait,'3-portrait.jpg',768,960);
  await button('New').click();
  await page.getByText('Vice City beach',{exact:true}).waitFor();
  assert.equal(await page.locator('#title').inputValue(),'VICE CITY');
  assert.equal(await page.locator('#caption').inputValue(),'A trip to Leonida has never been this wild.');
  for(const label of ['Classic Cover','Vice Sunset','4:5']){
    assert.equal(await button(label).getAttribute('aria-pressed'),'true');
  }
  await page.locator('#grain').uncheck();
  await exportPNG('1:1',1080,1080);
  assert.deepEqual(pageErrors,[]);
  assert.deepEqual(unexpected,[]);
  for(const old of ['1-cover.jpg','2-editor.jpg','3-cover.jpg']){
    await rm(resolve('screenshots',old),{force:true});
  }
  for(const [source,target=source] of [['1-cover.jpg'],['2-editor.jpg'],['3-portrait.jpg'],['1080x1080.png','4-square-export.png']]){
    await rename(resolve(staging,source),resolve('screenshots',target));
  }
  console.log('Offline Chromium checks passed; four dossier images captured.');
} finally {
  await browser.close();
  await rm(staging,{recursive:true,force:true});
}
