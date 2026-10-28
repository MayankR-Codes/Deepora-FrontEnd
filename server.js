'use strict';

const http = require('node:http');
const https = require('node:https');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');

// Root of frontend static files
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

function findSafePath(pathname) {
  const candidateRoots = [
    path.resolve(__dirname),
    path.resolve(process.cwd()),
    path.resolve('/var/task'),
    path.resolve(__dirname, '..'),
  ];
  for (const root of candidateRoots) {
    const candidatePath = path.resolve(root, `.${pathname}`);
    if (candidatePath.startsWith(root) && fsSync.existsSync(candidatePath)) {
      try {
        if (fsSync.statSync(candidatePath).isFile()) {
          return candidatePath;
        }
      } catch {}
    }
  }
  return null;
}

async function handleRequest(req, res) {
  // Proxy API requests to backend
  if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
    const backendOrigin = process.env.DEEPORA_API_ORIGIN || 'https://deepora-backend.vercel.app';
    const targetUrl = new URL(req.url, backendOrigin);
    const proxyHeaders = { ...req.headers, host: targetUrl.host };
    const proxyReq = https.request(
      targetUrl,
      {
        method: req.method,
        headers: proxyHeaders,
      },
      proxyRes => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', err => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend proxy error', details: err.message }));
    });
    return req.pipe(proxyReq);
  }

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
  else if (pathname === '/checkout') pathname = '/checkout.html';
  else if (pathname === '/account') pathname = '/account.html';
  else if (pathname === '/order-confirmation') pathname = '/order-confirmation.html';

  const filePath = findSafePath(pathname);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }

  try {
    const stats = fsSync.statSync(filePath);
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
}

module.exports = handleRequest;

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(port, host, () => {
    console.log(`Deepora Storefront UI running at http://${host}:${port}`);
  });
}
