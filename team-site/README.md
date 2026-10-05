# The collective: SDA team page

A team introduction with shared profile editing, persistent CV uploads, and an in-browser PDF viewer.

Live site: https://sda-team-collective.vercel.app

## Editing

Editing is closed after the team completed their profiles. Visitors can view profiles, social links, and resumes. The server rejects save requests, including requests from editors opened before editing closed.

If editing is reopened, click a person's card, choose **Edit profile**, update their details, optionally choose a PDF, and select **Save to website**. Changes are published for all visitors. Open editing does not require a login or private link.

Editable fields: full name, card title, discipline, card introduction, overview, areas of focus, education, experience and projects, GitHub, LinkedIn, and CV. PDF files can be up to 3 MB. A new upload replaces the displayed CV; the editor also supports removing it.

Concurrent edits use revisions and conditional storage writes. A stale form cannot overwrite a newer save. On a conflict, copy your changes before reloading the page to load the latest profile. Simply reopening the editor does not refresh an already loaded profile.

## Permanent storage

Vercel Blob store `sda-team-profiles` holds JSON profiles and CVs outside the deployment filesystem. Data survives reloads, different browsers, and redeployments. `profiles.js` provides the initial content only. After someone saves a profile, its stored details take precedence.

- Current profiles: `team-v1/profiles/{id}.json`
- Version snapshots: `team-v1/history/{id}/{revision}.json`
- PDF versions: `team-v1/resumes/{id}/{revision}.pdf`
- Editing switch: `team-v1/settings/editing.json`

The Blob store is private. Server endpoints publish profile details and the current CV. Historical files and storage credentials are not exposed. Snapshots are written before a conditional save, so the history may also contain an attempted update that lost a conflict. Use the current record's revision when investigating a save.

JSON reads request `Accept-Encoding: identity`. Compressed responses can supply a weak ETag, which fails conditional writes even when no other edit happened. The original representation supplies a strong ETag and preserves concurrent-save protection.

Create a private local backup from this directory with `node --env-file=.env.local scripts/backup-profiles.mjs`. It copies current records, all history and PDF versions, a published profile snapshot, and a hash manifest into the ignored root `.backups/` directory. It does not change remote data.

To test the real storage adapter, run `RUN_BLOB_INTEGRATION=1 node --env-file=.env.local --test tests/storage.integration.test.js` after initializing NVM. This uses synthetic profiles under a unique `checks/storage-regression/` prefix and retains those diagnostic records. The test covers repeated saves of a long profile and simultaneous edits.

## Close or reopen editing

From `team-site`, initialize NVM in WSL and pull the project environment if needed:

```sh
. "$HOME/.nvm/nvm.sh" && nvm use default
vercel env pull .env.local --yes
node --env-file=.env.local scripts/editing.mjs closed
```

Use `open` instead of `closed` to reopen editing. This updates the shared server-side switch immediately, including for already deployed versions of this editor. No redeployment is required. Saved details and CVs remain available. Open browsers lose the edit button when refreshed; their save requests are blocked immediately when editing is closed.

`PROFILE_EDITING_ENABLED=false` is an additional environment-level off switch. Keep it true or unset when using the shared setting.

## Local preview

```sh
. "$HOME/.nvm/nvm.sh" && nvm use default
npm ci
vercel env pull .env.local --yes
npm run dev
```

Open http://localhost:4173. The local server supports the same APIs as Vercel. With the linked environment, local edits affect the same shared profiles as the live site. Do not use the old Python static server for editing.

For isolated manual tests, set `PROFILE_STORAGE_PREFIX=checks/<unique-name>` and `PORT=4174`. This isolates profile and CV data; the shared editing switch still applies. Never commit `.env.local` or storage credentials.

## Build, checks, and deployment

```sh
npm test
npm run build
vercel deploy --prod --project sda-team-collective
```

The build copies only public frontend assets to `public/`. Vercel builds `/api/profiles` and `/api/resume` as server functions. The project is `sda-team-collective` in `isaudas-projects`.

Automated service tests cover persistence behavior, independent profiles, simultaneous saves, CV replacement and removal, editing closure, and invalid fields/files. Browser checks cover mobile layouts, accessibility, cloud persistence across browser sessions, CV download, and conflict handling.
