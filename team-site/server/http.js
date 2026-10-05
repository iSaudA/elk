import { createProfileService, ProfileError } from './profile-service.js';
import { storage } from './storage.js';

export const service = createProfileService(storage, {
  editingOpen: async () => {
    if (process.env.PROFILE_EDITING_ENABLED === 'false') return false;
    const setting = await storage.readJson('team-v1/settings/editing.json');
    return setting?.data.open === true;
  },
  prefix: process.env.PROFILE_STORAGE_PREFIX || 'team-v1',
});
export function json(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(JSON.stringify(body));
}
export function failure(response, error) {
  if (error instanceof ProfileError) return json(response, error.status, { error: error.message });
  console.error('Profile storage request failed:', error.name);
  return json(response, 503, { error: 'The site could not reach its storage. Your changes have not been confirmed. Please try again.' });
}
