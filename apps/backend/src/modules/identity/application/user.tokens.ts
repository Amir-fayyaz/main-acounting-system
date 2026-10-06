/**
 * The Identity module's dependency-injection tokens.
 *
 * The repository and the event recorder are the two things the module exports
 * behind tokens; everything else (use cases, controller) is auto-registered or
 * resolved by NestJS from the module's own provider factories.
 */

/** The Identity module's user repository, wired to the Drizzle adapter. */
export const USER_REPOSITORY = 'USER_REPOSITORY';

/** The recorder the application uses to persist User domain events. */
export const USER_EVENT_RECORDER = 'USER_EVENT_RECORDER';
