import { get, put, BlobPreconditionFailedError, BlobError } from '@vercel/blob';

export const storage = {
  async readJson(pathname) {
    // Compression turns the ETag into a weak validator, which cannot be used
    // for conditional writes. Read the original representation and its tag.
    const result = await get(pathname, {
      access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' },
    });
    if (!result) return null;
    return { data: await new Response(result.stream).json(), etag: result.blob.etag };
  },
  async writeJson(pathname, data, etag) {
    return put(pathname, JSON.stringify(data), {
      access: 'private', contentType: 'application/json', addRandomSuffix: false,
      allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}),
    });
  },
  writePdf(pathname, bytes) {
    return put(pathname, bytes, { access: 'private', contentType: 'application/pdf', addRandomSuffix: false });
  },
  readPdf(pathname) {
    return get(pathname, { access: 'private', useCache: false });
  },
  isConflict(error) {
    return error instanceof BlobPreconditionFailedError || (error instanceof BlobError && /already exists/i.test(error.message));
  },
};
