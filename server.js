/**
 * FTMercati Web — Development Server
 *
 * Serve i file statici e fa proxy delle chiamate API verso service.ftmercati.com
 * per evitare problemi di CORS durante lo sviluppo locale.
 *
 * Uso: node server.js [porta]
 * Default: http://localhost:8080
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.argv[2]) || 8080;
const API_TARGET = 'service.ftmercati.com';

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // ── API Proxy ──
  if (pathname.startsWith('/api/')) {
    const apiUrl = `https://${API_TARGET}${pathname}${parsed.search || ''}`;
    console.log(`[PROXY] ${req.method} ${pathname} → ${apiUrl}`);

    const options = {
      hostname: API_TARGET,
      port: 443,
      path: `${pathname}${parsed.search || ''}`,
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FTMercati-Web/2.0',
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.writeHead(proxyRes.statusCode, { 'Content-Type': proxyRes.headers['content-type'] || 'application/json' });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[PROXY ERROR] ${err.message}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Errore connessione al server API', details: err.message }));
    });

    proxyReq.end();
    return;
  }

  // ── CORS preflight ──
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ── Static file serving ──
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  // Sicurezza: previene path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback: serve index.html per route non trovate
        fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
          if (e2) {
            res.writeHead(404);
            res.end('404 — File non trovato');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(d2);
          }
        });
      } else {
        console.error(`[ERROR] ${err.message}`);
        res.writeHead(500);
        res.end('500 — Errore interno');
      }
      return;
    }

    // Cache headers per assets statici
    if (ext === '.css' || ext === '.js' || ext === '.woff2') {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║  FTMercati Web — Development Server      ║');
  console.log(`  ║  http://localhost:${PORT}                   ║`);
  console.log('  ║                                          ║');
  console.log('  ║  API Proxy → service.ftmercati.com       ║');
  console.log('  ║  Ctrl+C per fermare                      ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
