'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const port = Number(process.env.VIDEO_SERVER_PORT || 4174);
const host = process.env.VIDEO_SERVER_HOST || '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
};

http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/save-video' || req.url === '/save-poster')) {
    const isVideo = req.url === '/save-video';
    const destination = path.join(assets, isVideo ? 'deepora-hero.webm' : 'deepora-hero-poster.jpg');
    const chunks = [];
    let received = 0;
    const limit = isVideo ? 80 * 1024 * 1024 : 5 * 1024 * 1024;

    req.on('data', chunk => {
      received += chunk.length;
      if (received > limit) {
        res.writeHead(413);
        res.end('Upload exceeds local limit');
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      if (res.writableEnded) return;
      try {
        let body = Buffer.concat(chunks);
        if (!isVideo) body = Buffer.from(body.toString('utf8'), 'base64');
        if (!body.length || body.length > limit) throw new Error('Invalid upload payload');
        fs.writeFile(destination, body, error => {
          if (error) {
            res.writeHead(500);
            res.end(error.message);
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ saved: path.basename(destination), size: body.length }));
        });
      } catch (error) {
        res.writeHead(400);
        res.end(error.message);
      }
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  const url = new URL(req.url, `http://${host}:${port}`);
  const relative = decodeURIComponent(url.pathname === '/' ? '/video-maker.html' : url.pathname);
  const absolute = path.resolve(root, `.${relative}`);

  if (!absolute.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(absolute, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(absolute).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(port, host, () => {
  console.log(`Deepora local video renderer running at http://${host}:${port}/`);
});
