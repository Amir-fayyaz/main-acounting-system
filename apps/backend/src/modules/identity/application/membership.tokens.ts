/**
 * The Identity module's dependency-injection tokens for memberships (IAM-003).
 *
 * The membership feature exports its repository, event recorder and narrow
 * active-tenant-membership lookup behind tokens. Use cases and controllers stay
 * resolved by NestJS from the module's own provider factories.
 */

/** The Identity module's membership repository, wired to the Drizzle adapter. */
export const MEMBERSHIP_REPOSITORY = 'MEMBERSHIP_REPOSITORY';

/** The recorder the application uses to persist Membership domain events. */
export const MEMBERSHIP_EVENT_RECORDER = 'MEMBERSHIP_EVENT_RECORDER';

/** Narrow membership lookup used by the tenant authorization boundary. */
export const TENANT_MEMBERSHIP = 'TENANT_MEMBERSHIP';
