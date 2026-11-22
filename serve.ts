// A tiny static server for game/ (Node 22, standard library only), so the entry
// can be played locally without a build step: `node serve.ts` serves game/ on
// http://localhost:8080. It sends the MIME types a browser game needs, refuses
// any path outside game/, and otherwise does nothing clever.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
    .replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path === sep ? 'index.html' : path);
  if (!file.startsWith(root + sep) && file !== root) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  let stat;
  try {
    stat = statSync(file);
  } catch {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  if (stat.isDirectory()) {
    response.writeHead(302, { Location: `${request.url.replace(/\/?$/, '/')}index.html` });
    response.end();
    return;
  }
  response.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});

server.listen(port, () => {
  console.log(`Ember Sigils served at http://localhost:${port}`);
});
