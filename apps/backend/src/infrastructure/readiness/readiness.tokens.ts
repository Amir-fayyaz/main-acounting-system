/**
 * Token for the dependency probes used by readiness reporting. Probes are injected
 * as data so the service itself stays free of I/O and can be unit tested without
 * a database, Redis or an object store.
 */
export const READINESS_PROBES = Symbol('READINESS_PROBES');
