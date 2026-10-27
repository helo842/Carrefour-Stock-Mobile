import type { RequestHandler } from 'express';
import { unauthorized } from '../../core/errors.js';
import { parseInput } from '../../core/validation.js';
import {
  createUserBodySchema,
  updateRoleBodySchema,
  updateRoleParamsSchema,
} from './user.schemas.js';
import type { UserService } from './user.service.js';

export function createUserController(service: UserService): {
  me: RequestHandler;
  list: RequestHandler;
  updateRole: RequestHandler;
  create: RequestHandler;
} {
  return {
    me: async (req, res) => {
      if (!req.user) throw unauthorized();
      const profile = await service.getProfile(req.user.uid);
      res.status(200).json({ data: profile });
    },

    list: async (_req, res) => {
      const users = await service.list();
      res.status(200).json({ data: users, meta: { count: users.length } });
    },

    updateRole: async (req, res) => {
      if (!req.user) throw unauthorized();
      const { uid } = parseInput(updateRoleParamsSchema, req.params);
      const { role } = parseInput(updateRoleBodySchema, req.body);
      const profile = await service.updateRole(req.user, uid, role);
      res.status(200).json({ data: profile });
    },

    create: async (req, res) => {
      const input = parseInput(createUserBodySchema, req.body);
      const created = await service.create(input);
      res.status(201).json({ data: created });
    },
  };
}
