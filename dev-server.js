const http = require('http');
const fs = require('fs');
const path = require('path');
const analyze = require('./api/analyze');

const compare = require('./api/compare');

const root = __dirname;
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  if (req.url === '/api/compare') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Only POST is supported.' });
    req.setEncoding('utf8');
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 300_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        await compare({ method: req.method, body }, res);
      } catch { send(res, 400, { error: '請提供有效的 JSON 請求。' }); }
    });
    return;
  }
  if (req.url === '/api/analyze') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Only POST is supported.' });
    req.setEncoding('utf8');
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 200_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        const adapter = { status: (code) => ({ json: (payload) => send(res, code, payload) }), setHeader: (key, value) => res.setHeader(key, value) };
        await analyze({ method: req.method, body }, adapter);
      } catch { send(res, 400, { error: '請提供有效的 JSON 請求。' }); }
    });
    return;
  }
  const pathname = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(3000, '127.0.0.1', () => console.log('PWA preview: http://127.0.0.1:3000'));
