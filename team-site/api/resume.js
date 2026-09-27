import { Readable } from 'node:stream';
import { service, json, failure } from '../server/http.js';

export default async function handler(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    return json(response, 405, { error: 'Method not allowed.' });
  }
  try {
    const query = new URL(request.url, 'http://localhost').searchParams;
    const id = query.get('id');
    const result = await service.resume(id);
    if (!result) return json(response, 404, { error: 'Resume not found.' });
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', `${query.get('download') === '1' ? 'attachment' : 'inline'}; filename="${id}-resume.pdf"`);
    if (request.method === 'HEAD') { await result.stream.cancel(); response.end(); return; }
    Readable.fromWeb(result.stream).on('error', () => response.destroy()).pipe(response);
  } catch (error) { return failure(response, error); }
}
