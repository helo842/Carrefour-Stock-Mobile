import type { RequestHandler } from 'express';
import { unauthorized } from '../../core/errors.js';
import type { DashboardService } from './dashboard.service.js';

export function createDashboardController(service: DashboardService): {
  get: RequestHandler;
} {
  return {
    get: async (req, res) => {
      if (!req.user) throw unauthorized();
      const dashboard = await service.get(req.user.role);
      res.status(200).json({ data: dashboard });
    },
  };
}
