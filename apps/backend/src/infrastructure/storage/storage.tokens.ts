/**
 * Injection token for the object storage port. Consumers depend on the port, not
 * on the MinIO adapter (ADR-002, section 15).
 */
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
