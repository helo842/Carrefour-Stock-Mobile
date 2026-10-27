import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config/env.js';
import { nowIso } from './core/date.js';
import type { Logger } from './core/logger.js';
import type {
  FoodCatalogClient,
  IdentityAdmin,
  ProductRepository,
  StatisticsRepository,
  StockRepository,
  TokenVerifier,
  UserRepository,
} from './core/ports.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.js';
import { createDashboardController } from './modules/dashboard/dashboard.controller.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { createProductController } from './modules/products/product.controller.js';
import { ProductService } from './modules/products/product.service.js';
import { createStockController } from './modules/stock/stock.controller.js';
import { StockService } from './modules/stock/stock.service.js';
import { createUserController } from './modules/users/user.controller.js';
import { UserService } from './modules/users/user.service.js';
import { createApiRouter } from './routes/index.js';

export interface AppDependencies {
  config: AppConfig;
  logger: Logger;
  verifier: TokenVerifier;
  identity: IdentityAdmin;
  users: UserRepository;
  products: ProductRepository;
  stock: StockRepository;
  statistics: StatisticsRepository;
  catalog: FoodCatalogClient;
  /** Optional dependency check used by GET /ready (Firestore in production). */
  readiness?: () => Promise<boolean>;
}

export function createApp(deps: AppDependencies): Express {
  const { config, logger } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false);

  app.use(requestContext);

  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => {
        const id = res.getHeader('x-request-id');
        return typeof id === 'string' ? id : randomUUID();
      },
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/ready',
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(helmet());

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Native apps do not send Origin; browsers do and must be allowlisted.
      const allowed =
        !origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin);
      callback(null, allowed);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  };
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      version: process.env.APP_VERSION ?? '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: nowIso(),
    });
  });

  app.get('/ready', async (_req, res) => {
    try {
      const ready = deps.readiness ? await deps.readiness() : true;
      res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
    } catch (error) {
      logger.warn({ err: error }, 'Readiness check failed');
      res.status(503).json({ status: 'not_ready' });
    }
  });

  if (config.rateLimit.enabled) {
    app.use(
      '/api/v1',
      rateLimit({
        windowMs: config.rateLimit.windowMs,
        limit: config.rateLimit.max,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (_req, res) => {
          res.status(429).json({
            error: {
              code: 'RATE_LIMITED',
              message: 'Demasiadas peticiones. Espera unos segundos e inténtalo de nuevo.',
            },
          });
        },
      }),
    );
  }

  const productService = new ProductService({
    products: deps.products,
    stock: deps.stock,
    statistics: deps.statistics,
    catalog: deps.catalog,
    logger,
  });
  const stockService = new StockService({
    stock: deps.stock,
    products: deps.products,
    logger,
  });
  const dashboardService = new DashboardService({
    products: deps.products,
    stock: deps.stock,
    statistics: deps.statistics,
    lowStockThreshold: config.lowStockThreshold,
  });
  const userService = new UserService({
    users: deps.users,
    identity: deps.identity,
    logger,
  });

  const authenticate = createAuthenticate({
    verifier: deps.verifier,
    users: deps.users,
    logger,
  });

  app.use(
    '/api/v1',
    createApiRouter({
      authenticate,
      products: createProductController(productService),
      stock: createStockController(stockService, config.lowStockThreshold),
      dashboard: createDashboardController(dashboardService),
      users: createUserController(userService),
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
