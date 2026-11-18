/** Small HTTP helpers shared by the route handlers. */

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, 'bad_request', message, details);
export const notFound = (message = 'Resource not found') => new HttpError(404, 'not_found', message);
export const conflict = (message, details) => new HttpError(409, 'conflict', message, details);
export const methodNotAllowed = (allow) =>
  new HttpError(405, 'method_not_allowed', 'Method not allowed for this resource', { allow });

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function empty(status = 204, extraHeaders = {}) {
  return new Response(null, { status, headers: extraHeaders });
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    const headers = {};
    if (typeof err.details?.allow === 'string') headers.allow = err.details.allow;
    return json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.status,
      headers,
    );
  }
  console.error('Unhandled error:', err);
  return json(
    { error: { code: 'internal_error', message: 'Something went wrong handling the request.' } },
    500,
  );
}

/** Read a JSON object body, rejecting wrong content types and oversized payloads. */
export async function readJsonBody(request, { limit = 512 * 1024 } = {}) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Send the body as application/json.');
  }
  const text = await request.text();
  if (text.length > limit) {
    throw new HttpError(413, 'payload_too_large', `JSON body must be under ${limit} bytes.`);
  }
  if (!text.trim()) throw badRequest('Request body is empty.');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw badRequest('Request body is not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw badRequest('Request body must be a JSON object.');
  }
  return parsed;
}

export function intParam(value, { name, fallback, min, max }) {
  if (value === null || value === '') return fallback;
  if (!/^-?\d+$/.test(value)) throw badRequest(`Query parameter "${name}" must be an integer.`);
  const n = Number.parseInt(value, 10);
  if (n < min || n > max) {
    throw badRequest(`Query parameter "${name}" must be between ${min} and ${max}.`);
  }
  return n;
}

export const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, if-match',
  'access-control-max-age': '86400',
};
