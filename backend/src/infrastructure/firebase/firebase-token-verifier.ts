import type { Auth } from 'firebase-admin/auth';
import type { TokenVerifier } from '../../core/ports.js';

export class FirebaseTokenVerifier implements TokenVerifier {
  constructor(private readonly auth: Auth) {}

  async verify(token: string): Promise<{
    uid: string;
    email: string | null;
    name: string | null;
  }> {
    // checkRevoked=false keeps latency low; revocation is enforced on the next
    // short-lived ID token refresh (~1h) and by the Firestore profile lookup.
    const decoded = await this.auth.verifyIdToken(token, false);

    return {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : null,
      name: typeof decoded.name === 'string' ? decoded.name : null,
    };
  }
}
