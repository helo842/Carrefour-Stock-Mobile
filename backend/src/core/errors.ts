export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError(400, 'BAD_REQUEST', message, details);

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthorized = (message = 'Credenciales no válidas o ausentes.'): AppError =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (
  message = 'No tienes permisos para realizar esta acción.',
  code = 'FORBIDDEN',
): AppError => new AppError(403, code, message);

export const notFound = (message = 'Recurso no encontrado.', code = 'NOT_FOUND'): AppError =>
  new AppError(404, code, message);

export const conflict = (message: string, code = 'CONFLICT'): AppError =>
  new AppError(409, code, message);

export const upstreamError = (
  message = 'El servicio externo no está disponible en este momento.',
): AppError => new AppError(503, 'UPSTREAM_UNAVAILABLE', message);
