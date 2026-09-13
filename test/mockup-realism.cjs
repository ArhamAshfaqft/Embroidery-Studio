// Real Chromium canvas regression checks and photographic comparison renders.
// Run with Vite on port 5173: npx electron test/mockup-realism.cjs [before|after]
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const phase = process.argv[2] || 'after';
const baselinePath=path.resolve(__dirname,'../src/engine/mockupRenderer.baseline.ts');
if (phase==='before') fs.writeFileSync(baselinePath,execFileSync('git',['show','HEAD:src/engine/mockupRenderer.ts'],{cwd:path.resolve(__dirname,'..')}),{flag:'wx'});
app.setPath('userData', path.join(app.getPath('temp'), 'embroidery-mockup-realism-test'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  try {
    await win.loadURL('http://localhost:5173');
    const result = await win.webContents.executeJavaScript(`(async () => {
      const { MockupRenderer } = await import('/src/engine/mockupRenderer${phase === 'before' ? '.baseline' : ''}.ts');
      const { EmbroideryRenderer } = await import('/src/engine/embroideryRenderer.ts');
      const { DEFAULT_EMBROIDERY_SETTINGS } = await import('/src/engine/presets.ts');
      const make = (w,h) => Object.assign(document.createElement('canvas'), {width:w,height:h});
      const load = async url => {const img=new Image();img.src=url;await img.decode();return img;};
      const art = make(600,340), a = art.getContext('2d');
      a.fillStyle='#eee5ce'; a.font='bold 96px Arial';a.textAlign='center';a.fillText('ALPINE',300,160);
      a.strokeStyle='#c69955';a.lineWidth=15;a.beginPath();a.moveTo(150,90);a.lineTo(225,25);a.lineTo(290,90);a.stroke();
      a.fillStyle='#c69955';a.font='bold 28px Arial';a.fillText('OUTDOOR CLUB',300,220);
      const emb=new EmbroideryRenderer().renderEmbroidery(art,DEFAULT_EMBROIDERY_SETTINGS,1).canvas;
      const renderer=new MockupRenderer();
      const t={x:50,y:47,scale:0.85,rotation:0,opacity:1,blendMode:'normal',displacementStrength:4.5,fabricTextureStrength:2,creviceShadowStrength:3,shadowIntensity:0.6};
      const sheet=make(1800,900), ctx=sheet.getContext('2d');ctx.fillStyle='#17191b';ctx.fillRect(0,0,1800,900);
      const timings=[];
      for(const [i,name] of ['hoodie_gray.jpg','tshirt_black.jpg','tshirt_white_heavyweight.png'].entries()) {
        const garment=await load('/mockups/'+name), start=performance.now();
        // Place the hoodie sample below its drawstrings; strings need a
        // separately prepared foreground mask, which photo luminance cannot supply.
        const placement={...t,y:i===0?57:47};
        const render=renderer.composeMockup(garment,emb,placement,1200,1200,{embroideryRenderScale:emb.width/art.width});
        timings.push(Math.round(performance.now()-start));
        ctx.drawImage(render,0,0,1200,1200,i*600,30,600,600);
        ctx.drawImage(render,340,i===0?560:440,520,250,i*600,640,600,250);
        ctx.fillStyle='white';ctx.font='18px Arial';ctx.fillText(name,i*600+16,23);
      }
      const checks=[];
      let fabricComparison;
      if (${phase !== 'before'}) {
        const {renderFabricBlendComparison}=await import('/test/fabric-preview.ts');
        fabricComparison=await renderFabricBlendComparison(emb,art.width);
      }
      const check=(ok,name)=>checks.push({name,pass:!!ok});
      const cloth=make(240,240), g=cloth.getContext('2d');
      const gradient=g.createLinearGradient(0,0,240,0);gradient.addColorStop(0,'#303030');gradient.addColorStop(1,'#dddddd');g.fillStyle=gradient;g.fillRect(0,0,240,240);
      const block=make(80,80), b=block.getContext('2d');b.fillStyle='#ffffff';b.fillRect(0,0,80,80);
      const testT={...t,scale:1,x:50,y:50,shadowIntensity:0,fabricTextureStrength:0,creviceShadowStrength:0,displacementStrength:8,fabricBlendStrength:0};
      const warped=renderer.composeMockup(cloth,block,testT,240,240);
      const pixels=warped.getContext('2d').getImageData(0,0,240,240).data;
      let outside=0;for(let y=80;y<160;y++)for(let x=55;x<80;x++)if(pixels[(y*240+x)*4]>245)outside++;
      check(outside>30,'Warp moves solid artwork beyond its original rectangular bounds');
      b.clearRect(0,0,80,80);b.fillRect(15,15,50,50);b.clearRect(30,30,20,20);
      const holes=renderer.composeMockup(cloth,block,testT,240,240).getContext('2d').getImageData(0,0,240,240).data;
      let moved=0;for(let y=97;y<140;y++)for(let x=85;x<95;x++)if(holes[(y*240+x)*4]>245)moved++;
      check(moved>20,'Warp moves transparent artwork outlines as well as interior pixels');
      g.fillStyle='#777777';g.fillRect(0,0,240,240);
      const flat=renderer.composeMockup(cloth,block,{...testT,creviceShadowStrength:3,fabricTextureStrength:2},240,240);
      const plain=renderer.composeMockup(cloth,block,{...testT,displacementStrength:0},240,240);
      const f=flat.getContext('2d').getImageData(0,0,240,240).data,p=plain.getContext('2d').getImageData(0,0,240,240).data;
      check(f.every((v,i)=>v===p[i]),'Uniform fabric preserves artwork colour, shape and transparent holes');
      g.fillStyle='#cccccc';g.fillRect(0,0,240,240);g.fillStyle='#444444';g.fillRect(105,0,25,240);
      b.fillRect(0,0,80,80);
      const shaded=renderer.composeMockup(cloth,block,{...testT,displacementStrength:0,creviceShadowStrength:3},240,240);
      const sd=shaded.getContext('2d').getImageData(0,0,240,240).data;
      check(sd[(120*240+117)*4] < sd[(120*240+145)*4]-60,'Default fold shading visibly seats white thread in a dark crease');
      const { BackgroundRenderer }=await import('/src/engine/backgroundRenderer.ts');
      const worker=new BackgroundRenderer();
      const rotated={...t,scale:1,rotation:27};
      const direct=renderer.composeMockup(cloth,block,rotated,240,240).getContext('2d').getImageData(0,0,240,240).data;
      const remoteCanvas=(await worker.compose(cloth,block,rotated,240,240)).canvas;
      const readback=make(240,240);readback.getContext('2d').drawImage(remoteCanvas,0,0);
      const remote=readback.getContext('2d').getImageData(0,0,240,240).data;
      let maxDifference=0, changed=0;
      direct.forEach((v,i)=>{const delta=Math.abs(v-remote[i]);maxDifference=Math.max(maxDifference,delta);if(delta>2)changed++;});
      // Canvas and OffscreenCanvas can round the antialiased contact shadow by
      // a few 8-bit levels. Bound both the maximum and affected pixel count.
      check(maxDifference<=3 && changed<direct.length*.001,'Rotated mockups match between the preview and worker renderer');worker.dispose();
      const diagnostics={maxDifference,changed};
      const doubled=renderer.composeMockup(cloth,block,{...testT,rotation:19},480,480,{layoutWidth:240,layoutHeight:240});
      const reduced=make(240,240);reduced.getContext('2d').drawImage(doubled,0,0,240,240);
      const native=renderer.composeMockup(cloth,block,{...testT,rotation:19},240,240);
      const centroid=canvas=>{const d=canvas.getContext('2d').getImageData(0,0,240,240).data;let sx=0,sy=0,n=0;
        for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(d[(y*240+x)*4]>245){sx+=x;sy+=y;n++;}return [sx/n,sy/n,n];};
      const c1=centroid(native),c2=centroid(reduced);
      check(Math.hypot(c1[0]-c2[0],c1[1]-c2[1])<1 && Math.abs(c1[2]-c2[2])/c1[2]<0.05,'2x rendering preserves the size and placement of rotated warped artwork');
      if (${phase !== 'before'}) {
        const {runFabricIntegrationChecks}=await import('/test/fabric-integration.ts');
        checks.push(...await runFabricIntegrationChecks());
        const {ExportEngine}=await import('/src/engine/exportEngine.ts');
        const {getMockupEmbroiderySettings}=await import('/src/engine/mockupSettings.ts');
        const settings={...DEFAULT_EMBROIDERY_SETTINGS,stitchPlanningMode:'surface',shadowStrength:8};
        const effective=getMockupEmbroiderySettings(settings);
        check(effective.shadowStrength===0 && settings.shadowStrength===8,'Mockup removes the floating drop shadow without changing standalone settings');
        const garment=await load(cloth.toDataURL());
        const exporter=new ExportEngine();
        const output=await exporter.exportFinishedMockup(garment,block,settings,rotated,{format:'png',quality:1,resolutionMultiplier:1});
        const bitmap=await createImageBitmap(output.blob), actual=make(240,240);actual.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
        const stitches=new EmbroideryRenderer().renderEmbroidery(block,effective,1);
        const expected=renderer.composeMockup(garment,stitches.canvas,rotated,240,240,{embroideryRenderScale:stitches.width/block.width,layoutWidth:240,layoutHeight:240});
        const ad=actual.getContext('2d').getImageData(0,0,240,240).data,ed=expected.getContext('2d').getImageData(0,0,240,240).data;
        check(output.width===240 && output.height===240 && ad.every((v,i)=>Math.abs(v-ed[i])<=2),'PNG export matches mockup rendering with standalone shadows removed');exporter.cancel();
      }
      return {image:sheet.toDataURL('image/png').split(',')[1],fabricComparison,checks,timings,diagnostics};
    })()`);
    const dest=path.resolve(__dirname,'../demo-assets/mockup-realism-'+phase+'.png');
    fs.writeFileSync(dest,Buffer.from(result.image,'base64'));
    const comparisonPath=path.resolve(__dirname,'../demo-assets/automatic-fabric-blend.png');
    if(result.fabricComparison)fs.writeFileSync(comparisonPath,Buffer.from(result.fabricComparison,'base64'));
    console.log(JSON.stringify({...result,image:dest,fabricComparison:result.fabricComparison?comparisonPath:undefined},null,2));
    if(phase==='before')fs.unlinkSync(baselinePath);
    app.exit(phase==='after' && result.checks.some(c=>!c.pass)?1:0);
  } catch(error) {if(phase==='before' && fs.existsSync(baselinePath))fs.unlinkSync(baselinePath);console.error(error);app.exit(1);}
});
