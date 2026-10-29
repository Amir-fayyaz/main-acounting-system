import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';
import type { ActiveCompanySelection } from '../views/active-company-selection.view.js';

/**
 * What the tenant resource needs in order to let a member select their active
 * company (IAM-009).
 *
 * The preference itself is Identity-owned data — it belongs to the user and
 * spans companies — so the tenant module states the intent and Identity decides
 * how it is stored. The port is deliberately this narrow: one call, no
 * preference record, no repository. That is what lets the tenant module stay a
 * leaf and still offer the operation.
 *
 * The implementation must re-check active membership before writing and answer
 * a non-member with `TENANT_ACCESS_DENIED`, indistinguishably from an unknown
 * company.
 */
export interface ActiveCompanySelectionPort {
  select(input: {
    readonly userId: string;
    readonly tenantId: string;
  }): Promise<Result<ActiveCompanySelection, DomainError>>;
}
