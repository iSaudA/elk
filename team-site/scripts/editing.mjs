import { storage } from '../server/storage.js';
const mode = process.argv[2];
if (!['open', 'closed'].includes(mode)) throw new Error('Use: node --env-file=.env.local scripts/editing.mjs open|closed');
const path = 'team-v1/settings/editing.json';
const current = await storage.readJson(path);
await storage.writeJson(path, { open: mode === 'open', updatedAt: new Date().toISOString() }, current?.etag);
console.log(`Team editing is ${mode}. Saved profiles and CVs are unchanged. No redeploy is needed.`);
