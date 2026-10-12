import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openHistory, validAttempt, validSession } from './database.js';
import { NOTES } from './src/practice.js';

const root = dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain' };
const port = Number(process.env.PORT || 5173);
const history = openHistory(process.env.DB_PATH || resolve(root, 'data/history.sqlite'));
const json = (response, status, value) => response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(value));

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/api/history') {
      if (request.method !== 'GET') { json(response, 405, { error: 'Method not allowed' }); return; }
      const pending = [...new Set(url.searchParams.getAll('pending'))];
      if (pending.length > 36 || pending.some((key) => {
        const [stage, target, extra] = key.split(':');
        return extra !== undefined || !['notes', 'chords', 'inversions'].includes(stage) || !NOTES.includes(target);
      })) { json(response, 400, { error: 'Invalid pending targets' }); return; }
      const practiceHistory = pending.flatMap((key) => history.targetHistory(...key.split(':')));
      json(response, 200, { sessions: history.list(), attempts: history.attempts(), timings: history.timings(), stats: history.stats(), practice: history.practice(), practiceHistory }); return;
    }
    if (pathname === '/api/sessions' || pathname === '/api/attempts') {
      if (request.method !== 'POST') { json(response, 405, { error: 'Method not allowed' }); return; }
      const origin = request.headers.origin;
      if (origin && origin !== `http://${request.headers.host}` && origin !== `https://${request.headers.host}`) { json(response, 403, { error: 'Cross-origin writes are not allowed' }); return; }
      if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') { json(response, 415, { error: 'JSON content type required' }); return; }
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        if (Buffer.byteLength(body) > 16384) { json(response, 413, { error: 'Request too large' }); return; }
      }
      let entry;
      try { entry = JSON.parse(body); } catch { json(response, 400, { error: 'Invalid JSON' }); return; }
      const attempt = pathname === '/api/attempts';
      if (!(attempt ? validAttempt(entry) : validSession(entry))) { json(response, 400, { error: 'Invalid history entry' }); return; }
      if (attempt) history.saveAttempt(entry);
      else history.save(entry);
      json(response, 201, { saved: true }); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end('Method not allowed'); return; }
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.slice(root.length + 1);
    if (!path.startsWith(root + sep) || relative.split(sep).some((part) => part.startsWith('.') || ['node_modules', 'data'].includes(part)) || !types[extname(path)]) {
      response.writeHead(404).end('Not found'); return;
    }
    const info = await stat(path);
    if (!info.isFile()) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': `${types[extname(path)]}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') response.end();
    else createReadStream(path).pipe(response);
  } catch (error) {
    if (request.url?.startsWith('/api/')) {
      console.error('History request failed:', error.message);
      if (!response.headersSent) json(response, 500, { error: 'History unavailable' });
    } else if (!response.headersSent) response.writeHead(404).end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Piano trainer → http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { history.close(); process.exit(0); }));
