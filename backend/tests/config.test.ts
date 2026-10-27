import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

describe('configuration', () => {
  it('applies safe defaults when the environment is empty', () => {
    const config = loadConfig({});

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(8080);
    expect(config.lowStockThreshold).toBe(10);
    expect(config.rateLimit.enabled).toBe(true);
    expect(config.firebase.projectId).toBeUndefined();
    expect(config.openFoodFacts.baseUrl).toBe('https://world.openfoodfacts.org');
  });

  it('treats empty variables as unset (credentials via ADC)', () => {
    const config = loadConfig({
      FIREBASE_PROJECT_ID: '',
      FIREBASE_SERVICE_ACCOUNT_JSON: '',
      PORT: '',
    });

    expect(config.firebase.projectId).toBeUndefined();
    expect(config.firebase.serviceAccountJson).toBeUndefined();
    expect(config.port).toBe(8080);
  });

  it('parses booleans, numbers and CORS lists', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '9090',
      RATE_LIMIT_ENABLED: 'false',
      LOW_STOCK_THRESHOLD: '7',
      CORS_ORIGINS: 'https://app.example, https://admin.example',
      OFF_BASE_URL: 'https://world.openfoodfacts.org/',
    });

    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(9090);
    expect(config.rateLimit.enabled).toBe(false);
    expect(config.lowStockThreshold).toBe(7);
    expect(config.corsOrigins).toEqual([
      'https://app.example',
      'https://admin.example',
    ]);
    expect(config.openFoodFacts.baseUrl).toBe('https://world.openfoodfacts.org');
  });

  it('fails fast on invalid values', () => {
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrowError(
      /Configuración inválida/,
    );
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrowError(
      /Configuración inválida/,
    );
  });
});
