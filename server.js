const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ days: {} }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  return 'text/plain; charset=utf-8';
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/data' && req.method === 'GET') {
      return sendJson(res, 200, readData());
    }

    if (url.pathname === '/api/submission' && req.method === 'POST') {
      const { dayId, userKey, proofName = '', loadMultiplier = 1 } = await parseBody(req);
      if (!dayId || !userKey) {
        return sendJson(res, 400, { error: 'dayId and userKey are required' });
      }

      const data = readData();
      data.days[dayId] = data.days[dayId] || {};
      data.days[dayId][userKey] = {
        submitted: true,
        submittedAt: new Date().toLocaleString('uk-UA'),
        parentConfirmed: false,
        proofName,
        loadMultiplier,
      };
      writeData(data);
      return sendJson(res, 200, data);
    }

    if (url.pathname === '/api/confirm' && req.method === 'POST') {
      const { dayId, userKey } = await parseBody(req);
      if (!dayId || !userKey) {
        return sendJson(res, 400, { error: 'dayId and userKey are required' });
      }

      const data = readData();
      if (data.days[dayId] && data.days[dayId][userKey]) {
        data.days[dayId][userKey].parentConfirmed = true;
      }
      writeData(data);
      return sendJson(res, 200, data);
    }

    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const safePath = path.normalize(requested).replace(/^\.\.(\/|\\|$)/, '');
    const filePath = path.join(ROOT, safePath);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
