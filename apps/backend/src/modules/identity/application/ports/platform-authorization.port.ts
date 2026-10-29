import type { UserId } from '../../domain/value-objects/user-id.js';

/** Identity-owned platform authority, deliberately separate from tenant roles. */
export interface PlatformAuthorization {
  /** Whether this identity holds the first-class platform `system-admin` role. */
  hasSystemAdmin(userId: UserId): Promise<boolean>;

  /** Atomically creates the platform role assignment; repeated grants are safe. */
  grantSystemAdmin(userId: UserId): Promise<void>;
}
