import type { RequestHandler } from 'express';
import { forbidden, unauthorized } from '../core/errors.js';
import { ROLE_RANK, type Role } from '../core/types.js';

/**
 * Hierarchical authorization: admin > supervisor > employee.
 * Must run after `createAuthenticate`.
 */
export function authorize(minimumRole: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    if (ROLE_RANK[req.user.role] < ROLE_RANK[minimumRole]) {
      next(
        forbidden(
          `Esta acción requiere el rol ${minimumRole} o superior.`,
          'INSUFFICIENT_ROLE',
        ),
      );
      return;
    }

    next();
  };
}
