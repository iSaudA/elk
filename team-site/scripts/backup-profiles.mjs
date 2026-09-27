import { list, get } from '@vercel/blob';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const directory = resolve('../.backups', `team-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(directory, { recursive: true, mode: 0o700 });
const manifest = { startedAt: new Date().toISOString(), files: [] };
let cursor;
do {
  const page = await list({ prefix: 'team-v1/', cursor, limit: 1000 });
  for (const blob of page.blobs) {
    if (blob.pathname.split('/').some(part => part === '..')) throw new Error('Unexpected storage path');
    const result = await get(blob.pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) throw new Error(`Cannot read ${blob.pathname}`);
    const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
    const target = resolve(directory, blob.pathname);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    manifest.files.push({ pathname: blob.pathname, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), etag: result.blob.etag });
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);
const response = await fetch('https://sda-team-collective.vercel.app/api/profiles', { cache: 'no-store' });
if (!response.ok) throw new Error('Cannot read published profiles');
await writeFile(resolve(directory, 'published-profiles.json'), JSON.stringify(await response.json(), null, 2), { flag: 'wx', mode: 0o600 });
await copyFile('profiles.js', resolve(directory, 'seed-profiles.js'));
manifest.completedAt = new Date().toISOString();
await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
await writeFile(resolve(directory, 'README.txt'), 'Read-only backup of published team profiles, all stored history snapshots, and all uploaded CV versions. History includes attempted saves that may not have been published. The manifest records SHA-256 hashes of the exact stored bytes. This backup does not change editing access. No remote data was changed or deleted.\n', { flag: 'wx' });
console.log(JSON.stringify({ directory, files: manifest.files.length, pdfs: manifest.files.filter(file => file.pathname.endsWith('.pdf')).length }));
