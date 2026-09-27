import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { storage } from '../server/storage.js';
import { createProfileService } from '../server/profile-service.js';
import { profiles } from '../profiles.js';

test('long profiles can be edited repeatedly while concurrent saves remain protected', {
  skip: process.env.RUN_BLOB_INTEGRATION !== '1',
}, async () => {
  // Synthetic records stay outside published profiles. Retain them for diagnosis.
  const prefix = `checks/storage-regression/${randomUUID()}`;
  const service = createProfileService(storage, { prefix, editingOpen: () => true });
  const fields = { ...profiles[0], summary: 'Cloud computing and cybersecurity experience. '.repeat(55) };
  const first = await service.save('saud', { fields, revision: null });
  const second = await service.save('saud', { fields: { ...fields, education: 'Updated education' }, revision: first.revision });
  assert.notEqual(first.revision, second.revision);
  const outcomes = await Promise.allSettled([
    service.save('saud', { fields: { ...fields, education: 'Concurrent A' }, revision: second.revision }),
    service.save('saud', { fields: { ...fields, education: 'Concurrent B' }, revision: second.revision }),
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(result => result.status === 'rejected').reason.status, 409);
  const winner = outcomes.find(result => result.status === 'fulfilled').value;
  assert.equal((await service.list()).profiles[0].revision, winner.revision);
  await assert.rejects(service.save('saud', { fields, revision: first.revision }), error => error.status === 409);
});
