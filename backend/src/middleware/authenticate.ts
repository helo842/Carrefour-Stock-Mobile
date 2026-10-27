import type { RequestHandler } from 'express';
import { forbidden, unauthorized } from '../core/errors.js';
import type { TokenVerifier, UserRepository } from '../core/ports.js';
import type { Logger } from '../core/logger.js';

interface AuthenticateDependencies {
  verifier: TokenVerifier;
  users: UserRepository;
  logger: Logger;
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) return null;
  return token.trim();
}

/**
 * Verifies the Firebase ID token and resolves the caller's role from Firestore,
 * which is the source of truth. Roles loaded per request make privilege changes
 * effective immediately, without waiting for a token refresh.
 */
export function createAuthenticate({
  verifier,
  users,
  logger,
}: AuthenticateDependencies): RequestHandler {
  return async (req, _res, next) => {
    try {
      const token = extractBearerToken(req.header('authorization'));
      if (!token) {
        throw unauthorized('Debes iniciar sesión para acceder a este recurso.');
      }

      let identity;
      try {
        identity = await verifier.verify(token);
      } catch (error) {
        logger.warn({ err: error, requestId: req.requestId }, 'ID token rejected');
        throw unauthorized('La sesión ha caducado o el token no es válido.');
      }

      const profile = await users.findById(identity.uid);
      if (!profile) {
        throw forbidden(
          'Tu cuenta no está dada de alta en Carrefour Stock. Contacta con un administrador.',
          'USER_NOT_PROVISIONED',
        );
      }

      req.user = {
        uid: profile.uid,
        email: profile.email,
        name: profile.name,
        role: profile.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
