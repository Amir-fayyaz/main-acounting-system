/**
 * Technical contract for object storage (TECH-008).
 *
 * This is the infrastructure-level port: it only exposes what the platform needs
 * to know about storage availability and configuration. The business-facing
 * File/Document contract belongs to the Documents module and is introduced with
 * that module; object keys, credentials and provider details never reach Domain.
 */
export interface ObjectStoragePort {
  readonly provider: string;

  /**
   * Verifies that the configured provider is reachable and that the credentials
   * are accepted. Throws with a precise reason when it is not.
   */
  checkAvailability(): Promise<void>;
}
