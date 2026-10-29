/**
 * The application-level representation of a selected company (IAM-009).
 *
 * It states the company the user is now working in and when the selection was
 * made. It deliberately says nothing about whether the user may *act* in that
 * company: that answer comes from the authorization boundary on each request,
 * never from a stored preference.
 */
export interface ActiveCompanyView {
  /** The selected company's stable identity. */
  readonly tenantId: string;
  /** When the selection was recorded, ISO-8601 in UTC. */
  readonly selectedAt: string;
}
