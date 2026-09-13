// Run against the local dev server: npx electron test/studio-visual.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  try {
    await window.loadURL('http://localhost:5173');
    const result = await window.webContents.executeJavaScript(`(async () => {
      const { EmbroideryRenderer } = await import('/src/engine/embroideryRenderer.ts');
      const { DEFAULT_EMBROIDERY_SETTINGS } = await import('/src/engine/presets.ts');
      const input = document.createElement('canvas'); input.width = 640; input.height = 480;
      const c = input.getContext('2d'); c.fillStyle = '#efe4c7'; c.font = 'bold 85px Arial';
      c.fillText('MAPLE', 160, 140); c.fillStyle = '#c34236';
      c.beginPath(); c.ellipse(320, 275, 100, 70, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e4aa39'; c.lineWidth = 16; c.strokeStyle = c.fillStyle;
      c.beginPath(); c.arc(320, 285, 142, 0, Math.PI * 2); c.stroke();
      const sheet = document.createElement('canvas'); sheet.width = 1920; sheet.height = 510;
      const s = sheet.getContext('2d'); s.fillStyle = '#44523d'; s.fillRect(0,0,1920,510);
      const reports = [];
      for (const [i, style] of ['classic', 'natural', 'studio'].entries()) {
        const settings = {...DEFAULT_EMBROIDERY_SETTINGS, renderStyle: style};
        const output = new EmbroideryRenderer().renderEmbroidery(input, settings);
        s.drawImage(output.canvas, i * 640, 30); s.fillStyle = '#fff'; s.font = '22px Arial';
        s.fillText(style, i * 640 + 20, 28);
        const doubled = new EmbroideryRenderer().renderEmbroidery(input, settings, 2);
        if(doubled.width !== 1280 || doubled.height !== 960) throw Error('Export dimensions failed');
        const corner = output.canvas.getContext('2d').getImageData(0,0,1,1).data;
        if(corner[3] !== 0) throw Error('Transparency lost');
        reports.push({style, timeMs: output.renderTimeMs, transparent: true, export2x: true});
      }
      return { image: sheet.toDataURL('image/png').split(',')[1], reports };
    })()`);
    const dest = path.join(__dirname, '../demo-assets/studio-thread-comparison.png');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(result.image, 'base64'));
    console.log(JSON.stringify({ ...result, image: dest }));
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
