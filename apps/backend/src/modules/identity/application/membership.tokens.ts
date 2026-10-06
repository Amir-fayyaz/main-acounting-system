/**
 * The Identity module's dependency-injection tokens for memberships (IAM-003).
 *
 * The repository and the event recorder are the two things the membership
 * feature exports behind tokens; everything else (use cases, controller) is
 * resolved by NestJS from the module's own provider factories.
 */

/** The Identity module's membership repository, wired to the Drizzle adapter. */
export const MEMBERSHIP_REPOSITORY = 'MEMBERSHIP_REPOSITORY';

/** The recorder the application uses to persist Membership domain events. */
export const MEMBERSHIP_EVENT_RECORDER = 'MEMBERSHIP_EVENT_RECORDER';
