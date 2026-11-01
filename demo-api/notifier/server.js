'use strict';

const http = require('http');

// Se trouve dans le compose.yml
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 64 * 1024; // 64 Ko en limite haute

function log(obj) {
  console.log(JSON.stringify({ level: 'info', ...obj }));
}

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const t0 = Date.now();
  res.on('finish', () => log({ method: req.method, path: req.url, status: res.statusCode, ms: Date.now() - t0 }));

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'UP' });
  }

  if (req.method === 'POST' && req.url === '/notify') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        send(res, 413, { error: 'payload_too_large' });
        req.destroy();
      }
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      let data;
      try {
        data = JSON.parse(body || '{}');
      } catch {
        return send(res, 400, { error: 'invalid_json' });
      }
      log({ msg: 'notification received', payload: data });
      send(res, 202, { received: true });
    });
    return;
  }

  send(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => log({ msg: 'notifier started', port: PORT }));

// PID 1 : Arrêt
function shutdown(sig) {
  log({ msg: 'shutting down', sig });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));