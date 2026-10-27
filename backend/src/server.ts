import { deleteApp } from 'firebase-admin/app';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { initFirebase } from './config/firebase.js';
import { createLogger } from './core/logger.js';
import { FirebaseIdentityAdmin } from './infrastructure/firebase/firebase-identity-admin.js';
import { FirebaseTokenVerifier } from './infrastructure/firebase/firebase-token-verifier.js';
import { createFirestoreReadiness } from './infrastructure/firebase/firestore-readiness.js';
import { FirestoreProductRepository } from './infrastructure/firestore/firestore-product.repository.js';
import { FirestoreStatisticsRepository } from './infrastructure/firestore/firestore-statistics.repository.js';
import { FirestoreStockRepository } from './infrastructure/firestore/firestore-stock.repository.js';
import { FirestoreUserRepository } from './infrastructure/firestore/firestore-user.repository.js';
import { OpenFoodFactsClient } from './integrations/openfoodfacts/openfoodfacts.client.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({
    level: config.logLevel,
    pretty: config.nodeEnv === 'development',
  });

  if (config.nodeEnv === 'production' && config.corsOrigins.length === 0) {
    logger.warn(
      'CORS_ORIGINS está vacío: se permitirá cualquier origen. Configúralo con los dominios de confianza.',
    );
  }

  const firebase = initFirebase(config);

  const catalog = new OpenFoodFactsClient(config.openFoodFacts, logger);
  const app = createApp({
    config,
    logger,
    verifier: new FirebaseTokenVerifier(firebase.auth),
    identity: new FirebaseIdentityAdmin(firebase.auth),
    users: new FirestoreUserRepository(firebase.db),
    products: new FirestoreProductRepository(firebase.db),
    stock: new FirestoreStockRepository(firebase.db),
    statistics: new FirestoreStatisticsRepository(firebase.db),
    catalog,
    readiness: createFirestoreReadiness(firebase.db),
  });

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(
      { port: config.port, environment: config.nodeEnv },
      'Carrefour Stock API listening',
    );
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    server.close((error) => {
      if (error) logger.error({ err: error }, 'Error while closing HTTP server');
      void deleteApp(firebase.app)
        .catch((cleanupError: unknown) =>
          logger.error({ err: cleanupError }, 'Error while closing Firebase app'),
        )
        .finally(() => process.exit(error ? 1 : 0));
    });

    // Never hang forever on stuck connections.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

main().catch((error: unknown) => {
  // The logger may not exist yet (configuration failed), so use stderr.
  console.error('No se pudo arrancar la API:', error);
  process.exit(1);
});
