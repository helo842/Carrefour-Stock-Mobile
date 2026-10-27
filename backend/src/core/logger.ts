import { pino, type Logger } from 'pino';

export type { Logger };

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'authorization',
  'token',
  'password',
];

export function createLogger(options: {
  level: string;
  pretty: boolean;
}): Logger {
  return pino({
    level: options.level,
    base: { service: 'carrefour-stock-backend' },
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(options.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname,service',
            },
          },
        }
      : {}),
  });
}

export const silentLogger: Logger = pino({ level: 'silent' });
