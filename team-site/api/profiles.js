import { service, json, failure } from '../server/http.js';

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') return json(response, 200, await service.list());
    if (request.method === 'POST') {
      if (Number(request.headers['content-length'] || 0) > 4_300_000) return json(response, 413, { error: 'Choose a CV smaller than 3 MB.' });
      if (!request.headers['content-type']?.startsWith('application/json')) return json(response, 415, { error: 'Send profile details as JSON.' });
      const id = new URL(request.url, 'http://localhost').searchParams.get('id');
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      return json(response, 200, { profile: await service.save(id, body) });
    }
    response.setHeader('Allow', 'GET, POST');
    return json(response, 405, { error: 'Method not allowed.' });
  } catch (error) {
    if (error instanceof SyntaxError) return json(response, 400, { error: 'The profile data could not be read. Please try again.' });
    return failure(response, error);
  }
}
