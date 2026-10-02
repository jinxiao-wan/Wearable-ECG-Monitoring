// Run in the dedicated GitHub workflow with Playwright; no local installation needed to view the site.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const root=path.resolve(__dirname,'../demo');
  const server=http.createServer((req,res)=>{
    const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+relative+(relative.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,bytes)=>{
      if(error){res.writeHead(404);res.end();return;}
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.csv':'text/csv'};
      res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.getElementById('bpm').textContent!=='—');
    assert.equal(await page.locator('#beats').textContent(),'74');
    for(const id of ['hardware','mechanical','process','software','results','archive'])assert.equal(await page.locator('#'+id).count(),1);
    // Expand the development screenshot so every source image can be checked.
    await page.locator('details summary').click();
    await page.evaluate(async()=>{
      for(const image of document.querySelectorAll('img:not(#enlarged-image)'))image.loading='eager';
      await Promise.all([...document.querySelectorAll('img:not(#enlarged-image)')].map(image=>image.decode()));
    });
    const broken=await page.locator('img:not(#enlarged-image)').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));
    assert.deepEqual(broken,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('details summary').click();
    await page.locator('[data-image="assets/pcb-layout.png"]').click();
    assert.equal(await page.locator('#image-dialog').evaluate(d=>d.open),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#image-dialog').evaluate(d=>d.open),false);
    await page.locator('#raw').uncheck();await page.locator('#raw').check();
    fs.mkdirSync('outputs/webpage',{recursive:true});
    // Reload before captures to clear control focus and pending smooth scrolling.
    async function prepareCapture(){
      await page.reload({waitUntil:'networkidle'});
      await page.waitForFunction(()=>document.getElementById('bpm').textContent!=='—');
      await page.evaluate(async()=>{
        document.activeElement?.blur();document.documentElement.style.scrollBehavior='auto';
        for(const image of document.querySelectorAll('img:not(#enlarged-image)'))image.loading='eager';
        await Promise.all([...document.querySelectorAll('img:not(#enlarged-image)')].map(image=>image.decode()));
        window.scrollTo(0,0);
      });
      await page.waitForFunction(()=>window.scrollY===0 && document.querySelector('.site-header').getBoundingClientRect().top===0);
    }
    await prepareCapture();
    await page.screenshot({path:'outputs/webpage/desktop-viewport.png'});
    await page.screenshot({path:'outputs/webpage/desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await prepareCapture();
    await page.screenshot({path:'outputs/webpage/mobile-viewport.png'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'outputs/webpage/mobile.png',fullPage:true});
    await page.locator('[data-image="assets/circuit-schematic.png"]').click();
    assert.equal(await page.locator('#image-dialog').evaluate(d=>d.open),true);
    await page.locator('#close-image').click();
    assert.deepEqual(errors,[]);
    console.log('Webpage passed: all original images load, desktop/mobile have no horizontal overflow, gallery and ECG controls work.');
  } finally {if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
