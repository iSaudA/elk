import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import profilesHandler from '../api/profiles.js';
import resumeHandler from '../api/resume.js';
const root = resolve('.');
const publicFiles = new Set(['index.html', 'app.js', 'profiles.js', 'styles.css', 'tokens.css', 'favicon.svg']);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/api/profiles' || pathname === '/api/resume') {
      if (request.method === 'POST') {
        const chunks = []; let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 4_300_000) { response.writeHead(413); response.end(); return; }
          chunks.push(chunk);
        }
        request.body = Buffer.concat(chunks).toString();
      }
      return await (pathname === '/api/profiles' ? profilesHandler : resumeHandler)(request, response);
    }
    const file = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    if (!publicFiles.has(file) && !/^resumes\/[a-zA-Z0-9_.-]+\.pdf$/.test(file)) { response.writeHead(404); response.end('Not found'); return; }
    const data = await readFile(resolve(root, file));
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Team site: http://localhost:${process.env.PORT || 4173}`));
