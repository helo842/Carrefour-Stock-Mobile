import type { Role } from '../types/api';

const ROLE_RANK: Record<Role, number> = {
  employee: 1,
  supervisor: 2,
  admin: 3,
};

export const roleLabels: Record<Role, string> = {
  employee: 'Empleado',
  supervisor: 'Supervisor',
  admin: 'Administrador',
};

/** Stable order used by role pickers. */
export const ROLES_FOR_PICKER: readonly Role[] = ['employee', 'supervisor', 'admin'];

export function hasAtLeastRole(role: Role | undefined | null, minimum: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const permissions = {
  viewLowStock: (role: Role | null | undefined) => hasAtLeastRole(role, 'supervisor'),
  manageStock: (role: Role | null | undefined) => role === 'admin',
  manageUsers: (role: Role | null | undefined) => role === 'admin',
};
