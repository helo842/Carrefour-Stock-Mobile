import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGINS: z.string().default(''),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  LOW_STOCK_THRESHOLD: z.coerce.number().int().min(1).max(100_000).default(10),
  RATE_LIMIT_ENABLED: booleanString.optional().transform((value) => value ?? true),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  OFF_BASE_URL: z.string().url().default('https://world.openfoodfacts.org'),
  OFF_USER_AGENT: z
    .string()
    .min(1)
    .default('CarrefourStockMobile/1.0 (internal-employee-app)'),
  OFF_TIMEOUT_MS: z.coerce.number().int().min(500).default(6_000),
  OFF_CACHE_TTL_MS: z.coerce.number().int().min(0).default(600_000),
  OFF_SEARCH_CACHE_TTL_MS: z.coerce.number().int().min(0).default(300_000),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: string;
  corsOrigins: string[];
  firebase: {
    projectId?: string;
    serviceAccountJson?: string;
  };
  lowStockThreshold: number;
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  openFoodFacts: {
    baseUrl: string;
    userAgent: string;
    timeoutMs: number;
    productCacheTtlMs: number;
    searchCacheTtlMs: number;
  };
};

/**
 * Reads and validates configuration once at process start. Failing fast here is
 * intentional: a misconfigured container must not start serving traffic.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // `FOO=` in a .env file means "not set", not an empty string. Dropping empty
  // values lets defaults and optional credentials (ADC) work as expected.
  const cleanedEnv = Object.fromEntries(
    Object.entries(env).filter(
      ([, value]) => !(typeof value === 'string' && value.trim().length === 0),
    ),
  );

  const parsed = envSchema.safeParse(cleanedEnv);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración inválida: ${details}`);
  }

  const value = parsed.data;

  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
    corsOrigins: value.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    firebase: {
      projectId: value.FIREBASE_PROJECT_ID,
      serviceAccountJson: value.FIREBASE_SERVICE_ACCOUNT_JSON,
    },
    lowStockThreshold: value.LOW_STOCK_THRESHOLD,
    rateLimit: {
      enabled: value.RATE_LIMIT_ENABLED,
      windowMs: value.RATE_LIMIT_WINDOW_MS,
      max: value.RATE_LIMIT_MAX,
    },
    openFoodFacts: {
      baseUrl: value.OFF_BASE_URL.replace(/\/+$/, ''),
      userAgent: value.OFF_USER_AGENT,
      timeoutMs: value.OFF_TIMEOUT_MS,
      productCacheTtlMs: value.OFF_CACHE_TTL_MS,
      searchCacheTtlMs: value.OFF_SEARCH_CACHE_TTL_MS,
    },
  };
}
