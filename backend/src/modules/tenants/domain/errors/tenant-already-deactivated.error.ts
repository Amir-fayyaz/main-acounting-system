import { InvalidStateError } from '@shared/domain/invalid-state.error';

/** Raised when deactivating a tenant that is already DEACTIVATED. */
export class TenantAlreadyDeactivatedError extends InvalidStateError {}
