import type { Auth } from 'firebase-admin/auth';
import type { IdentityAdmin } from '../../core/ports.js';
import type { ProvisionUserInput } from '../../core/types.js';

export class FirebaseIdentityAdmin implements IdentityAdmin {
  constructor(private readonly auth: Auth) {}

  async createUser(input: ProvisionUserInput): Promise<{ uid: string }> {
    const user = await this.auth.createUser({
      email: input.email,
      displayName: input.name,
      password: input.temporaryPassword,
      emailVerified: false,
    });

    return { uid: user.uid };
  }

  createPasswordResetLink(email: string): Promise<string> {
    return this.auth.generatePasswordResetLink(email);
  }

  async deleteUser(uid: string): Promise<void> {
    await this.auth.deleteUser(uid);
  }
}
