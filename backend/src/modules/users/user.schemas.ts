import { z } from 'zod';
import { ROLES } from '../../core/types.js';

export const roleSchema = z.enum(ROLES);

export const updateRoleParamsSchema = z.object({
  uid: z.string().trim().min(1).max(128),
});

export const updateRoleBodySchema = z.object({
  role: roleSchema,
});

export const createUserBodySchema = z.object({
  name: z.string().trim().min(2, 'El nombre es demasiado corto.').max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('El correo electrónico no es válido.')
    .max(254),
  role: roleSchema.default('employee'),
});
