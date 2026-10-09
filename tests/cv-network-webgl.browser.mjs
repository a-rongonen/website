// Optional browser regression suite. Set PLAYWRIGHT_MODULE to a Playwright ESM
// entry point if it is not installed locally. No browser package is shipped.
import assert from 'node:assert/strict';
import { cvNetworkConfig } from '../src/data/cv-network.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
});
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8787';
const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const errors=[];
page.on('pageerror', error=>errors.push(error.message));
await page.addInitScript(()=>{
  window.meshCalls=[];window.meshFrames=0;window.meshUploads=0;
  const proto=WebGL2RenderingContext.prototype;
  const clear=proto.clear, draw=proto.drawArraysInstanced, upload=proto.bufferData, update=proto.bufferSubData;
  proto.clear=function(...args){window.meshCalls=[];window.meshFrames++;return clear.apply(this,args);};
  proto.bufferData=function(...args){window.meshUploads++;return upload.apply(this,args);};
  proto.bufferSubData=function(...args){window.meshUploads++;return update.apply(this,args);};
  proto.drawArraysInstanced=function(...args){
    const program=this.getParameter(this.CURRENT_PROGRAM);
    const uniform=name=>this.getUniform(program,this.getUniformLocation(program,'u_'+name));
    window.meshCalls.push({
      instances:args[0]===this.POINTS?args[2]:args[3],repeat:uniform('repeat'),anchor:uniform('anchorY'),cameraY:uniform('cameraY'),
      focal:uniform('focal'),firstRow:uniform('firstRow'),color:Array.from(uniform('color')),
      static:uniform('static'),unitScale:uniform('unitScale'),rotation:Array.from(uniform('rotation')),scissor:Array.from(this.getParameter(this.SCISSOR_BOX)),
    });
    return draw.apply(this,args);
  };
});
const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const state=()=>page.evaluate(()=>({
  calls:window.meshCalls,frames:window.meshFrames,uploads:window.meshUploads,
  bitmap:[document.querySelector('canvas').width,document.querySelector('canvas').height],
}));
async function ready(route='/cv') {
  await page.goto(base+route);
  await page.waitForFunction(()=>window.meshCalls.length>0);
  assert(await page.locator('canvas').evaluate(e=>!!e.getContext('webgl2')), 'GPU renderer must initialize');
  await page.evaluate(()=>scrollTo(0,700));await settle();
}
try {
  for(const route of ['/cv','/cv-fi']) {
    await ready(route);
    const initial=await state();
    assert(initial.calls.length<=10);
    assert(initial.calls.every(c=>c.instances>1 && c.repeat>0));
    assert(initial.calls.every(c=>c.focal===initial.calls[0].focal && c.cameraY===initial.calls[0].cameraY),
      'All palette bands share one camera');
    const captureAlpha = () => page.evaluate(() => new Promise(resolve => {
      dispatchEvent(new Event('scroll'));
      requestAnimationFrame(() => {
        const canvas = document.querySelector('canvas'), gl = canvas.getContext('webgl2');
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        const alpha = pixels.filter((_,i)=>i%4===3);
        const previous = window.previousAlpha;
        const visible = alpha.filter(a=>a>10).length;
        const differences = previous ? alpha.filter((a,i)=>Math.abs(a-previous[i])>2).length : 0;
        window.previousAlpha = alpha;
        resolve({ visible, differenceRatio: differences / alpha.length });
      });
    }));
    assert((await captureAlpha()).visible>1000,'Mesh must rasterize visible pixels');
    const repeatScroll = initial.calls[0].repeat * initial.calls[0].unitScale / (cvNetworkConfig.parallax || 1);
    await page.evaluate(y=>scrollTo(0,y),700+repeatScroll);await settle();
    assert((await captureAlpha()).differenceRatio<0.005,'A complete vertical period must repeat the same mesh');
    await page.evaluate(()=>scrollTo(0,780));await settle();
    assert.equal((await state()).uploads,initial.uploads,'Scrolling must not upload mesh buffers');
    const idle=(await state()).frames;
    await page.waitForTimeout(100);
    assert.equal((await state()).frames,idle,'Idle renderer must sleep');
    for(const reduced of [false,true]) {
      await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await settle();
      const stable=await state();
      for(const value of [780,724,844]) {
        await page.evaluate(value=>{Object.defineProperty(window,'innerHeight',{configurable:true,value});dispatchEvent(new Event('resize'));},value);
        await settle();
        const current=await state();
        assert.deepEqual(current.bitmap,stable.bitmap,'Toolbar must not resize bitmap');
        assert.deepEqual(current.calls,stable.calls,'Toolbar must not change projection or bands');
      }
    }
    await page.evaluate(()=>{delete window.innerHeight;});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:844,height:390});await settle();
    assert.equal((await state()).bitmap[0],1477,'Orientation must update dimensions');
    await page.setViewportSize({width:390,height:844});await settle();
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('cv-network').evaluate(e=>getComputedStyle(e).display),'none');
    await page.emulateMedia({media:'screen'});
    assert.equal(await page.locator('.glass').first().evaluate(e=>getComputedStyle(e).backdropFilter),'none');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log(route+': GPU buffers, shared camera, idle, toolbar, orientation, reduced motion, print PASS');
  }
  // Override only the fetched test bundle: never rewrite the user's config.
  for(const [enabled,height] of [[true,1600],[false,800]]) {
    await page.route('**/_astro/*.js',async route=>{
      const response=await route.fetch(), source=await response.text();
      assert(/verticalRepeat:\{enabled:!0,height:\d+\}/.test(source),'Locate repeat controls');
      await route.fulfill({response,body:source.replace(/verticalRepeat:\{enabled:!0,height:\d+\}/,
        'verticalRepeat:{enabled:'+enabled+',height:'+height+'}')});
    });
    await ready();
    const current=await state();
    if(enabled)assert(current.calls.every(c=>c.repeat===height));
    else assert(current.calls.every(c=>c.instances===1));
    await page.unroute('**/_astro/*.js');
  }
  await page.route('**/_astro/*.js',async route=>{
    const response=await route.fetch(),source=await response.text();
    assert(source.includes('motion:{enabled:!1'));
    await route.fulfill({response,body:source.replace('motion:{enabled:!1','motion:{enabled:!0')});
  });
  await ready();
  const motionStart=await state();
  await page.waitForTimeout(100);
  assert((await state()).frames>motionStart.frames,'Optional motion must animate');
  assert.notDeepEqual((await state()).calls[0].rotation,motionStart.calls[0].rotation);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await state();
  await page.waitForTimeout(100);
  assert.equal((await state()).frames,hidden.frames,'Hidden tabs must stop optional motion');
  await page.unroute('**/_astro/*.js');
  await ready();
  await page.locator('canvas').evaluate(e=>e.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(()=>!!document.querySelector('canvas').getContext('2d'));
  await settle();
  const fallback=await page.locator('canvas').evaluate(e=>{
    const data=e.getContext('2d').getImageData(0,0,e.width,e.height).data;
    return data.some((v,i)=>i%4===3&&v>0);
  });
  assert(fallback,'Context loss must produce a visible Canvas fallback');
  const context=await browser.newContext();
  await context.addInitScript(()=>{
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args);};
  });
  const fallbackPage=await context.newPage();
  await fallbackPage.goto(base+'/cv-fi');
  await fallbackPage.waitForFunction(()=>document.querySelector('canvas').width>0);
  assert(await fallbackPage.locator('canvas').evaluate(e=>!!e.getContext('2d')));
  await context.close();
  assert.deepEqual(errors,[]);
  console.log('Repeat height, repeat disable, unavailable-GPU fallback, and context-loss recovery PASS');
} finally { await browser.close(); }
