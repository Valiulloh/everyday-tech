const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (!types[path.extname(file)]) {
      res.writeHead(404).end('Not found');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)],
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(data);
    });
  })
  .listen(4173, '127.0.0.1', () => console.log('Everyday Tech: http://127.0.0.1:4173'));
