import type { DateTime } from '../../../../shared/time/date-time.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import type { UserId } from '../../domain/value-objects/user-id.js';

/**
 * The durable store of a user's selected company (IAM-009).
 *
 * Selecting a company is a *user preference*, not a property of the company
 * and not a session value: it must survive a sign-out and a new browser. The
 * port therefore stores one active tenant per user and nothing else — no
 * company name, no permissions, no lifecycle.
 *
 * The port belongs to Identity, which owns the user identity, and the adapter
 * lives in this module's persistence boundary. A caller can read the selection
 * back or overwrite it, but never delete it: the absence of a row simply means
 * "no company selected yet".
 */
export interface ActiveCompanyPreference {
  /** The company the user selected, or `undefined` when none was selected. */
  findActiveTenant(userId: UserId): Promise<TenantReference | undefined>;

  /**
   * Records `tenantId` as the user's active company, replacing any previous
   * selection. The write is idempotent: selecting the same company twice is a
   * successful, harmless write.
   */
  setActiveTenant(userId: UserId, tenantId: TenantReference, selectedAt: DateTime): Promise<void>;
}
