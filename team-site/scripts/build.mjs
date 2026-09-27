import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('public', { recursive: true });
for (const file of ['index.html', 'styles.css', 'tokens.css', 'app.js', 'profiles.js', 'favicon.svg']) await copyFile(file, `public/${file}`);
await cp('resumes', 'public/resumes', { recursive: true });
console.log('Built public team site. Server code and local settings are excluded.');
