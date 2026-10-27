import { create, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env, isFirebaseConfigured } from '../config/env';
import { getFirebaseAuth } from '../services/firebase';
import { ApiError, isApiErrorBody } from './errors';
import type { ApiErrorBody } from '../types/api';

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const http = create({
  baseURL: `${env.apiUrl}/api/v1`,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use(async (config) => {
  if (!isFirebaseConfigured) return config;

  const user = getFirebaseAuth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const user = isFirebaseConfigured ? getFirebaseAuth().currentUser : null;

    // A single forced token refresh covers clock skew and revoked sessions.
    if (status === 401 && original && !original._retry && user) {
      original._retry = true;
      try {
        const token = await user.getIdToken(true);
        original.headers.set('Authorization', `Bearer ${token}`);
        return await http(original);
      } catch {
        await getFirebaseAuth().signOut();
        throw new ApiError({
          message: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
          code: 'SESSION_EXPIRED',
          status: 401,
        });
      }
    }

    throw normalizeError(error);
  },
);

function normalizeError(error: AxiosError<ApiErrorBody>): ApiError {
  if (error.response) {
    const body = error.response.data;
    if (isApiErrorBody(body)) {
      return new ApiError({
        message: body.error.message,
        code: body.error.code,
        status: error.response.status,
        details: body.error.details,
        requestId: body.error.requestId,
      });
    }

    return new ApiError({
      message: 'El servidor ha devuelto una respuesta no esperada.',
      code: 'UNEXPECTED_RESPONSE',
      status: error.response.status,
    });
  }

  if (error.code === 'ECONNABORTED') {
    return new ApiError({
      message: 'La petición ha tardado demasiado. Inténtalo de nuevo.',
      code: 'TIMEOUT',
      status: 0,
    });
  }

  return new ApiError({
    message:
      'No se pudo conectar con el servidor. Comprueba tu conexión y la dirección de la API.',
    code: 'NETWORK_ERROR',
    status: 0,
  });
}
