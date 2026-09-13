import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

function mockupsFolderPlugin(): Plugin {
  return {
    name: 'mockups-folder-scanner',
    configureServer(server) {
      const mockupsDir = path.resolve(process.cwd(), 'public', 'mockups');

      // Ensure public/mockups directory exists
      if (!fs.existsSync(mockupsDir)) {
        fs.mkdirSync(mockupsDir, { recursive: true });
      }

      // API Endpoint: /api/mockups
      server.middlewares.use('/api/mockups', (req, res) => {
        try {
          if (!fs.existsSync(mockupsDir)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
          }

          const files = fs.readdirSync(mockupsDir);
          const validImages = files.filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f));

          const result = validImages.map(filename => {
            const filePath = path.join(mockupsDir, filename);
            let mtime = Date.now();
            let size = 0;
            try {
              const stat = fs.statSync(filePath);
              mtime = stat.mtimeMs;
              size = stat.size;
            } catch {
              // Ignore stat errors
            }

            return {
              filename,
              url: `/mockups/${filename}?v=${Math.round(mtime)}`,
              mtime,
              size
            };
          });

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err) }));
        }
      });

      // API Endpoint: /api/open-mockups-folder
      server.middlewares.use('/api/open-mockups-folder', (req, res) => {
        try {
          if (process.platform === 'win32') {
            exec(`explorer "${mockupsDir}"`);
          } else if (process.platform === 'darwin') {
            exec(`open "${mockupsDir}"`);
          } else {
            exec(`xdg-open "${mockupsDir}"`);
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, path: mockupsDir }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err) }));
        }
      });

      // Watch public/mockups folder for changes
      server.watcher.add(mockupsDir);
      server.watcher.on('all', (event, filePath) => {
        const normalized = path.normalize(filePath);
        if (normalized.startsWith(mockupsDir)) {
          server.ws.send({
            type: 'custom',
            event: 'mockups-folder-changed',
            data: { event, filePath }
          });
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    mockupsFolderPlugin()
  ],
  server: {
    port: 5173,
    host: true
  }
});
