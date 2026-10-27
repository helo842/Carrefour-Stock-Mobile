import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { isAppError } from '../core/errors.js';
import type { Logger } from '../core/logger.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `La ruta ${req.method} ${req.path} no existe.`,
      requestId: req.requestId,
    },
  });
};

/**
 * Translates every failure into the same error envelope, so clients (and the
 * mobile app in particular) only need one parser.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (isAppError(error)) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
          requestId: req.requestId,
        },
      });
      return;
    }

    // Malformed JSON is a client error thrown by express.json().
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'El cuerpo de la petición no es JSON válido.',
          requestId: req.requestId,
        },
      });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos enviados no son válidos.',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.') || '(root)',
            message: issue.message,
          })),
          requestId: req.requestId,
        },
      });
      return;
    }

    logger.error({ err: error, requestId: req.requestId }, 'Unhandled error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Se ha producido un error interno. Inténtalo de nuevo.',
        requestId: req.requestId,
      },
    });
  };
}
