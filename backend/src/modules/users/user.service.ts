import { randomBytes } from 'node:crypto';
import { conflict, forbidden, notFound } from '../../core/errors.js';
import { nowIso } from '../../core/date.js';
import type { Logger } from '../../core/logger.js';
import type { IdentityAdmin, UserRepository } from '../../core/ports.js';
import type {
  CreateUserInput,
  CreatedUser,
  Role,
  UserProfile,
} from '../../core/types.js';

interface UserServiceDependencies {
  users: UserRepository;
  identity: IdentityAdmin;
  logger: Logger;
}

function isFirebaseError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

export class UserService {
  constructor(private readonly deps: UserServiceDependencies) {}

  async getProfile(uid: string): Promise<UserProfile> {
    const profile = await this.deps.users.findById(uid);
    if (!profile) {
      throw forbidden(
        'Tu cuenta no está dada de alta en Carrefour Stock. Contacta con un administrador.',
        'USER_NOT_PROVISIONED',
      );
    }
    return profile;
  }

  list(): Promise<UserProfile[]> {
    return this.deps.users.list();
  }

  /**
   * Admins can change roles, with two safety rails: nobody can demote
   * themselves and the last admin cannot be removed.
   */
  async updateRole(
    actor: { uid: string; email: string },
    targetUid: string,
    role: Role,
  ): Promise<UserProfile> {
    const target = await this.deps.users.findById(targetUid);
    if (!target) {
      throw notFound('El usuario indicado no existe.', 'USER_NOT_FOUND');
    }

    if (targetUid === actor.uid && role !== 'admin') {
      throw conflict(
        'No puedes quitarte a ti mismo el rol de administrador.',
        'CANNOT_DEMOTE_SELF',
      );
    }

    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = await this.deps.users.countByRole('admin');
      if (adminCount <= 1) {
        throw conflict(
          'Debe existir al menos un administrador en la aplicación.',
          'LAST_ADMIN',
        );
      }
    }

    const updated = await this.deps.users.updateRole(targetUid, role);
    if (!updated) {
      throw notFound('El usuario indicado no existe.', 'USER_NOT_FOUND');
    }

    this.deps.logger.info(
      {
        actorUid: actor.uid,
        actorEmail: actor.email,
        targetUid,
        previousRole: target.role,
        newRole: role,
      },
      'User role updated',
    );

    return updated;
  }

  /**
   * Provisions a user in Firebase Authentication plus its Firestore profile.
   * The temporary password is never returned; the admin receives a reset link.
   */
  async create(input: CreateUserInput): Promise<CreatedUser> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.deps.users.findByEmail(email);
    if (existing) {
      throw conflict('Ya existe un usuario con ese correo electrónico.', 'EMAIL_IN_USE');
    }

    let uid: string;
    try {
      const temporaryPassword = randomBytes(24).toString('base64url');
      const created = await this.deps.identity.createUser({
        name: input.name.trim(),
        email,
        role: input.role,
        temporaryPassword,
      });
      uid = created.uid;
    } catch (error) {
      if (isFirebaseError(error) && error.code === 'auth/email-already-exists') {
        throw conflict('Ya existe un usuario con ese correo electrónico.', 'EMAIL_IN_USE');
      }
      throw error;
    }

    let profile: UserProfile;
    try {
      profile = await this.deps.users.create({
        uid,
        name: input.name.trim(),
        email,
        role: input.role,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    } catch (error) {
      // Compensating action: never leave an orphaned Auth account.
      await this.deps.identity.deleteUser(uid).catch((cleanupError: unknown) => {
        this.deps.logger.error(
          { err: cleanupError, uid },
          'Could not roll back Auth user after Firestore failure',
        );
      });
      throw error;
    }

    let passwordResetLink: string | null = null;
    try {
      passwordResetLink = await this.deps.identity.createPasswordResetLink(email);
    } catch (error) {
      this.deps.logger.warn(
        { err: error, uid },
        'User created but password reset link could not be generated',
      );
    }

    this.deps.logger.info({ uid, email, role: input.role }, 'User provisioned');

    return { profile, passwordResetLink };
  }
}
