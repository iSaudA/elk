import { randomUUID } from 'node:crypto';
import { profiles as initialProfiles } from '../profiles.js';

export const MAX_CV_BYTES = 3 * 1024 * 1024;
export class ProfileError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fieldLimits = { name: 100, role: 80, discipline: 100, description: 600, summary: 3000, education: 5000, experience: 8000, github: 200, linkedin: 300 };

export function validateFields(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProfileError(400, 'Profile details are missing.');
  const fields = {};
  for (const [key, limit] of Object.entries(fieldLimits)) {
    if (typeof input[key] !== 'string' || input[key].length > limit) throw new ProfileError(400, `Check the ${key} field. Maximum length: ${limit} characters.`);
    fields[key] = input[key].trim();
  }
  if (!fields.name || !fields.role || !fields.discipline) throw new ProfileError(400, 'Add your name, card title, and discipline.');
  if (fields.github.startsWith('https://github.com/')) {
    try {
      const url = new URL(fields.github);
      if (url.username || url.password || url.search || url.hash) throw new Error();
      fields.github = url.pathname.replace(/^\//, '').replace(/\/$/, '');
    } catch { throw new ProfileError(400, 'Enter a GitHub username or profile URL.'); }
  }
  fields.github = fields.github.replace(/^@/, '');
  if (fields.github && (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(fields.github) || fields.github.length > 39)) throw new ProfileError(400, 'Enter a valid GitHub username or profile URL.');
  if (fields.linkedin) {
    try {
      const url = new URL(fields.linkedin);
      if (url.protocol !== 'https:' || !['www.linkedin.com', 'linkedin.com'].includes(url.hostname) || !/^\/in\/[^/]+\/?$/.test(url.pathname) || url.username || url.password || url.port) throw new Error();
      fields.linkedin = `https://www.linkedin.com${url.pathname}`;
    } catch { throw new ProfileError(400, 'Enter a LinkedIn profile URL starting with https://www.linkedin.com/in/.'); }
  }
  if (!Array.isArray(input.skills) || input.skills.length > 16 || input.skills.some(skill => typeof skill !== 'string' || skill.length > 80)) throw new ProfileError(400, 'Use up to 16 areas of focus, each under 80 characters.');
  fields.skills = [...new Set(input.skills.map(skill => skill.trim()).filter(Boolean))];
  return fields;
}

export function validateCv(cv) {
  if (!cv || typeof cv.name !== 'string' || cv.name.length > 200 || typeof cv.base64 !== 'string') throw new ProfileError(400, 'Choose a PDF file to upload.');
  if (cv.base64.length > Math.ceil(MAX_CV_BYTES / 3) * 4) throw new ProfileError(413, 'Choose a PDF smaller than 3 MB.');
  const bytes = Buffer.from(cv.base64, 'base64');
  if (bytes.toString('base64') !== cv.base64) throw new ProfileError(400, 'The uploaded file could not be read. Choose the PDF again.');
  if (bytes.length > MAX_CV_BYTES) throw new ProfileError(413, 'Choose a PDF smaller than 3 MB.');
  if (bytes.subarray(0, 5).toString() !== '%PDF-' || !bytes.subarray(-2048).includes(Buffer.from('%%EOF'))) throw new ProfileError(400, 'That file is not a valid PDF. Choose your resume as a PDF.');
  return { bytes, name: cv.name.split(/[\\/]/).pop() || 'resume.pdf' };
}

export function createProfileService(storage, { editingOpen = () => false, prefix = 'team-v1' } = {}) {
  function baseFor(id) {
    const base = initialProfiles.find(profile => profile.id === id);
    if (!base) throw new ProfileError(404, 'Profile not found.');
    return base;
  }
  const pathFor = id => `${prefix}/profiles/${id}.json`;
  async function recordFor(id) {
    baseFor(id);
    return storage.readJson(pathFor(id));
  }
  function toPublic(id, record) {
    const base = baseFor(id);
    const saved = record?.data;
    return {
      ...base, ...saved?.fields,
      revision: saved?.revision || null,
      updatedAt: saved?.updatedAt || null,
      resumeName: saved?.cv?.name || null,
      resumePdf: saved?.cv ? `/api/resume?id=${id}&v=${saved.revision}` : null,
    };
  }
  return {
    async list() {
      const profiles = await Promise.all(initialProfiles.map(async base => toPublic(base.id, await recordFor(base.id))));
      return { profiles, editingOpen: await editingOpen(), maxCvBytes: MAX_CV_BYTES };
    },
    async save(id, input) {
      if (!await editingOpen()) throw new ProfileError(403, 'Editing is closed. Your changes have not been saved.');
      baseFor(id);
      if (!input || typeof input !== 'object' || !Object.hasOwn(input, 'revision') || (input.revision !== null && typeof input.revision !== 'string')) throw new ProfileError(400, 'Reload the profile before editing.');
      const fields = validateFields(input.fields);
      if (input.removeCv !== undefined && typeof input.removeCv !== 'boolean') throw new ProfileError(400, 'Invalid CV selection.');
      if (input.cv && input.removeCv) throw new ProfileError(400, 'Choose either a replacement CV or remove the current CV.');
      const file = input.cv ? validateCv(input.cv) : null;
      const current = await recordFor(id);
      if ((current?.data.revision || null) !== input.revision) throw new ProfileError(409, 'Someone updated this profile while you were editing. Your changes are still in this form. Copy them before reloading the page to load the latest version.');
      const revision = randomUUID();
      let cv = input.removeCv ? null : current?.data.cv || null;
      if (file) {
        const pathname = `${prefix}/resumes/${id}/${revision}.pdf`;
        await storage.writePdf(pathname, file.bytes);
        cv = { pathname, name: file.name };
      }
      const data = { fields, cv, revision, updatedAt: new Date().toISOString() };
      // Keep every saved version and its PDF so earlier details can be recovered.
      await storage.writeJson(`${prefix}/history/${id}/${revision}.json`, data);
      try {
        await storage.writeJson(pathFor(id), data, current?.etag);
      } catch (error) {
        if (storage.isConflict(error)) throw new ProfileError(409, 'Someone just saved this profile. Your changes are still in this form. Copy them before reloading the page to load their update.');
        throw error;
      }
      return toPublic(id, { data });
    },
    async resume(id) {
      const record = await recordFor(id);
      if (!record?.data.cv) throw new ProfileError(404, 'This person has not uploaded a resume yet.');
      return storage.readPdf(record.data.cv.pathname);
    },
  };
}
