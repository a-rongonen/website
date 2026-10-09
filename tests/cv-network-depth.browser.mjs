// Deterministic pixel regression: near nodes must cover far nodes, even across repeat rows.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022})).toString('base64');
const scene = moduleUrl(await readFile(new URL('../src/scripts/cv-network-scene.ts', import.meta.url), 'utf8'));
const renderer = moduleUrl((await readFile(new URL('../src/scripts/cv-network-webgl.ts', import.meta.url), 'utf8')).replace("'./cv-network-scene'", JSON.stringify(scene)));
const browser = await chromium.launch({headless: true, channel: process.env.BROWSER_CHANNEL || undefined});
try {
  const page = await browser.newPage();
  const results = await page.evaluate(async url => {
    const {createNetworkGpu} = await import(url);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 200;
    const gpu = createNetworkGpu(canvas);
    if (!gpu) throw new Error('WebGL2 renderer failed to initialize');
    const gl = canvas.getContext('webgl2');
    const band = [{top:0, height:200, rgb:[255,255,255], previousRgb:[255,255,255], transition:0, invisible:false}];
    const view = {width:200,height:200,pixelRatio:1,cameraDistance:1000,cameraY:0,anchorY:100,focalLength:1000,
      sin:0,cos:1,depthExtent:200,depthDarkening:.8,repeatHeight:200,unitScale:1,staticProjection:true,
      firstRow:0,rowCount:2,lineWidth:0,nodeSize:12};
    const pixel = () => {const p = new Uint8Array(4);gl.readPixels(100,100,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);};
    const results = [];
    for (const angle of [0,.18,-.18]) {
      view.sin = Math.sin(angle); view.cos = Math.cos(angle);
      // Inverse rotation keeps the projected centers coincident while exercising order updates.
      const near = {x:-200*view.sin,y:0,z:200*view.cos};
      const far = {x:200*view.sin,y:-240,z:-200*view.cos};
      for (const points of [[near,far],[far,near]]) {
        gpu.setGeometry(points,[]);
        gpu.render({...view,sin:0,cos:1},band,0);
        gpu.render(view,band,0);
        const overlap = pixel();
        gpu.setGeometry([near],[]);gpu.render(view,band,0);
        results.push({angle,overlap,nearOnly:pixel(),error:gl.getError()});
      }
    }
    gpu.dispose();
    return results;
  },renderer);
  for (const result of results) {
    assert.deepEqual(result.overlap,result.nearOnly,'Far node from a later repeat must not cover the nearer node');
    assert(result.overlap[0] > 250 && result.overlap[3] === 255);
    assert.equal(result.error,0);
  }
  console.log('Overlapping repeat rows, input order, and rotated depth: 6 pixel comparisons PASS');
} finally {await browser.close();}
