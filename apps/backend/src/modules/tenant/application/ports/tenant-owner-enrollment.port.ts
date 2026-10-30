import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';

/**
 * The tenant module's contract for provisioning the first membership of a new
 * company (IAM-009; IAM-003).
 *
 * Creating a company and making its creator a member is one business
 * operation: a company that exists without its creator being able to enter it
 * is not a usable company. The tenant module therefore states the need as a
 * narrow port — "enroll this user as an owner of this new tenant" — and the
 * Identity module implements it, because membership is Identity-owned data.
 *
 * The port is deliberately tiny: it names no role, no permission and no
 * invitation. Role assignment and additional members remain separate
 * operations. The implementation runs inside the caller's transaction and
 * under the new tenant's scope, so the tenant row and the membership row commit
 * together or not at all.
 */
export interface TenantOwnerEnrollment {
  /**
   * Links `userId` to the freshly created `tenantId`.
   *
   * Returns a failed `Result` when the user cannot be enrolled (for example the
   * user no longer exists); the caller must treat that as a failure of the
   * whole creation and let its transaction roll back.
   */
  enrollOwner(input: {
    readonly tenantId: string;
    readonly userId: string;
  }): Promise<Result<void, DomainError>>;
}
