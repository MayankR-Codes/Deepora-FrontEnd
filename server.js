'use strict';

const http = require('node:http');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');

// Root of frontend files is this directory
const frontendRoot = path.resolve(__dirname);
const port = Number(process.env.FRONTEND_PORT || 4173);
const host = process.env.FRONTEND_HOST || '127.0.0.1';

const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${host}:${port}`).pathname);
  } catch {
    res.writeHead(400);
    return res.end('Invalid URL');
  }

  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(frontendRoot, `.${pathname}`);

  // Prevent directory traversal attacks
  if (!filePath.startsWith(frontendRoot + path.sep) && filePath !== frontendRoot) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) throw new Error('Not a file');

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const rangeHeader = req.headers.range;

    // Support HTTP Range requests for video seeking (Safari, Chrome, iOS)
    if (rangeHeader && contentType.startsWith('video/')) {
      const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if (!match || (!match[1] && !match[2])) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        return res.end();
      }

      const start = match[1] ? Number(match[1]) : Math.max(0, stats.size - Number(match[2]));
      const end = match[2] && match[1] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;

      if (start >= stats.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        return res.end();
      }

      res.writeHead(206, {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Content-Type': contentType,
      });

      if (req.method === 'HEAD') return res.end();
      return fsSync.createReadStream(filePath, { start, end }).pipe(res);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      ...(contentType.startsWith('video/') ? { 'Accept-Ranges': 'bytes' } : {}),
      'Content-Length': stats.size,
      'Cache-Control': ['.html', '.js', '.css'].includes(ext) ? 'no-cache' : 'public, max-age=3600',
    });

    if (req.method === 'HEAD') return res.end();
    return fsSync.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }
});

server.listen(port, host, () => {
  console.log(`Deepora Storefront UI running at http://${host}:${port}`);
});
