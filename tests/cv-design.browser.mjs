// Optional visual regression checks; uses the same external Playwright setup as the mesh suite.
import assert from 'node:assert/strict';
import { networkPalette, cvNetworkConfig } from '../src/data/cv-network.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8788';
const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
try {
  for (const fallback of [false,true]) {
    const context = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    if (fallback) await context.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type,...args) { return type === 'webgl2' ? null : get.call(this,type,...args); };
    });
    const page = await context.newPage(), errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    for (const route of ['/cv','/cv-fi']) {
      await page.goto(base+route);
      await page.waitForFunction(()=>document.querySelector('canvas').width>0);
      await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
      assert.equal(await page.locator('.cv-hero-background').count(),1);
      assert.match(await page.locator('.cv-portrait img').getAttribute('src'), /\.png$/);
      assert(await page.locator('canvas').evaluate((c,f)=>!!c.getContext(f?'2d':'webgl2'),fallback));
      assert.equal(await page.locator('.cv-hero-background').evaluate(e=>getComputedStyle(e).maskImage),'none');
      assert.equal(await page.locator('.cv-hero').evaluate(e=>getComputedStyle(e,'::after').height),'0px');
      assert.equal(await page.locator('.cv-profile').evaluate(e=>getComputedStyle(e,'::before').height),'0px');
      const heroAlpha=await page.evaluate(async ()=>{
        scrollTo(0,0);dispatchEvent(new Event('scroll'));
        return new Promise(resolve=>requestAnimationFrame(()=>{
          const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2');
          let pixels;
          if(gl){pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}
          else pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
          const hero=document.querySelector('.cv-hero').getBoundingClientRect();
          const ratio=canvas.width/document.documentElement.clientWidth,cutoff=hero.bottom-1;
          let maximum=0;
          for(let row=0;row<canvas.height;row++){
            const y=gl?(canvas.height-row-.5)/ratio:(row+.5)/ratio;
            if(y>=cutoff)continue;
            for(let x=0;x<canvas.width;x++)maximum=Math.max(maximum,pixels[(row*canvas.width+x)*4+3]);
          }
          resolve(maximum);
        }));
      });
      assert.equal(heroAlpha,0,'Hero must stay free of the content-section mesh, including its lower edge');
      for (const [previous,current] of [['profile','strengths'],['strengths','skills'],['skills','history']]) {
        const y = await page.locator(`[data-network-section="${current}"]`).evaluate(e=>e.getBoundingClientRect().top+scrollY);
        await page.evaluate(y=>scrollTo(0,y-180),y);
        const result = await page.evaluate(async ({previous,current,fade}) => {
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          // Read during the drawing frame, before the GPU's default framebuffer is discarded.
          dispatchEvent(new Event('scroll'));
          return new Promise(resolve=>requestAnimationFrame(()=>{
            const canvas=document.querySelector('canvas'), gl=canvas.getContext('webgl2');
            let data;
            if(gl){ data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data); }
            else data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
            const ratio=canvas.width/document.documentElement.clientWidth;
            const top=document.querySelector(`[data-network-section="${current.name}"]`).getBoundingClientRect().top;
            const before=document.querySelector(`[data-network-section="${previous.name}"]`).getBoundingClientRect();
            const after=document.querySelector(`[data-network-section="${current.name}"]`).getBoundingClientRect();
            let samples=0,error=0, early=0,late=0;
            for(let row=0;row<canvas.height;row++) {
              const screenY=gl ? (canvas.height-row-.5)/ratio : (row+.5)/ratio;
              const localFade=Math.min(fade, screenY<top ? before.height : after.height);
              const t=.5+(screenY-top)/localFade;
              if(t<.05||t>.95)continue;
              const expected=current.rgb.map((v,i)=>previous.rgb[i]+(v-previous.rgb[i])*t);
              const expectedSum=expected.reduce((a,b)=>a+b,0);
              for(let x=0;x<canvas.width;x++){
                const i=(row*canvas.width+x)*4;
                const sum=data[i]+data[i+1]+data[i+2];
                if(data[i+3]<180 || sum<80)continue;
                samples++; if(t<.3)early++;if(t>.7)late++;
                for(let c=0;c<3;c++)error=Math.max(error,Math.abs(data[i+c]/sum-expected[c]/expectedSum));
              }
            }
            resolve({samples,error,early,late});
          }));
        },{previous:{name:previous,rgb:rgb(networkPalette(previous).baseColor)},current:{name:current,rgb:rgb(networkPalette(current).baseColor)},fade:cvNetworkConfig.sectionTransition});
        assert(result.samples>100 && result.early>10 && result.late>10,JSON.stringify(result));
        assert(result.error<.03,`Smooth palette pixels: ${JSON.stringify(result)}`);
      }
      await page.emulateMedia({media:'print'});
      assert.equal(await page.locator('h1').evaluate(e=>getComputedStyle(e).color),'rgb(17, 17, 17)');
      await page.emulateMedia({media:'screen',forcedColors:'active'});
      assert.notEqual(await page.locator('h1').evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)');
      await page.emulateMedia({forcedColors:'none'});
      for(const width of [390,325]){
        await page.setViewportSize({width,height:844});
        await page.evaluate(()=>scrollTo(0,0));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      if(process.env.CV_SCREENSHOTS && !fallback) {
        await page.screenshot({path:`ignored-files/cv-design-${route.slice(1)}-mobile.png`,fullPage:true});
        await page.setViewportSize({width:1440,height:1000});
        await page.screenshot({path:`ignored-files/cv-design-${route.slice(1)}-desktop.png`,fullPage:true});
      }
      await page.setViewportSize({width:1440,height:1000});
      console.log(`${route} ${fallback?'Canvas2D':'WebGL2'}: gradient pixel colors, images, print, forced colors, narrow screens PASS`);
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();await page.goto(base+'/cv');
  const pixelReader=await browser.newPage();
  assert.equal(await page.locator('.cv-profile').evaluate(e=>getComputedStyle(e,'::before').height),'0px');
  assert.equal(await page.locator('.cv-hero-background').evaluate(e=>getComputedStyle(e).maskImage),'none');
  assert(await page.locator('.cv-portrait img').evaluate(i=>i.complete&&i.naturalWidth>0));
  // Background pixels must share the mesh's midpoint at the actual section boundary.
  await page.evaluate(()=>{const style=document.createElement('style');style.textContent='.cv-container { visibility: hidden; } cv-network { display: none; }';document.head.append(style);});
  for (const [previous,current] of [['profile','strengths'],['strengths','skills'],['skills','history']]) {
    const boundary=await page.locator('[data-network-section="'+current+'"]').evaluate(e=>e.getBoundingClientRect().top+scrollY);
    await page.evaluate(y=>scrollTo(0,y-180),boundary);
    const top=await page.locator('[data-network-section="'+current+'"]').evaluate(e=>e.getBoundingClientRect().top);
    const screenshot=await page.screenshot();
    const samples=await pixelReader.evaluate(async ({source,top})=>{
      const image=new Image();image.src=source;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const context=canvas.getContext('2d');context.drawImage(image,0,0);
      return [-45,0,45].map(offset=>{
        const y=Math.floor(top)+offset;
        return {y:y+.5,pixel:[...context.getImageData(Math.floor(canvas.width/2),y,1,1).data].slice(0,3)};
      });
    },{source:'data:image/png;base64,'+screenshot.toString('base64'),top});
    const from=rgb(networkPalette(previous).centerColor),to=rgb(networkPalette(current).centerColor);
    for(const sample of samples){
      const t=.5+(sample.y-top)/cvNetworkConfig.sectionTransition;
      const expected=to.map((value,i)=>from[i]+(value-from[i])*t);
      assert(sample.pixel.every((value,i)=>Math.abs(value-expected[i])<=2),'Centered CSS fade: '+JSON.stringify({previous,current,sample,expected}));
    }
  }
  console.log('No-JavaScript centered background pixels and PNG PASS');
  await context.close();
} finally { await browser.close(); }
