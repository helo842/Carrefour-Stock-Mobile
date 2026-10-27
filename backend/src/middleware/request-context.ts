import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Propagates a caller-provided request id (useful across services) or creates
 * one. The id is echoed in the response and included in every error payload.
 */
export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
};
