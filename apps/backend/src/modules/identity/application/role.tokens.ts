/**
 * The Identity module's dependency-injection tokens for roles and permissions
 * (IAM-004).
 *
 * The two repositories and the event recorder are the things the role feature
 * exports behind tokens; everything else (use cases, controllers) is resolved by
 * NestJS from the module's own provider factories.
 */

/** The Identity module's role repository, wired to the Drizzle adapter. */
export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';

/** The Identity module's membership-role assignment repository. */
export const MEMBERSHIP_ROLE_REPOSITORY = 'MEMBERSHIP_ROLE_REPOSITORY';

/** The recorder the application uses to persist role domain events. */
export const ROLE_EVENT_RECORDER = 'ROLE_EVENT_RECORDER';
