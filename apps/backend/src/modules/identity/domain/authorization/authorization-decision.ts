/**
 * The outcome of an authorization decision (IAM-006; ADR-010 sections 3 and 13).
 *
 * A decision is either an allow or a **reasoned** deny. The reason is the
 * vocabulary the API layer and the audit trail translate: it is how "you are
 * authenticated but lack the capability" stays distinguishable from "this
 * operation needs a tenant", "you have no membership in this tenant" and "your
 * membership is not active" — the distinctions the issue requires, without any
 * of them depending on an HTTP concept.
 *
 * There is deliberately no `unknown`, `default` or `error` state: an
 * authorization question that cannot be answered is answered `denied`, because
 * fail-closed is the only safe default (ADR-010 section 13).
 */
export type AuthorizationDenialReason =
  /** The operation is tenant-scoped but no valid target tenant was supplied. */
  | 'TENANT_CONTEXT_MISSING'
  /** The caller has no membership in the target tenant. */
  | 'MEMBERSHIP_MISSING'
  /** The caller's membership in the target tenant is not active. */
  | 'MEMBERSHIP_INACTIVE'
  /** The caller does not hold the required capability. */
  | 'PERMISSION_MISSING'
  /** The evidence is internally inconsistent (e.g. a membership for another tenant). */
  | 'CONTEXT_INCONSISTENT';

/** An allow: the requirement is satisfied by the evidence. */
export interface AuthorizationAllow {
  readonly allowed: true;
}

/** A deny: the requirement is not satisfied, and why. */
export interface AuthorizationDeny {
  readonly allowed: false;
  readonly reason: AuthorizationDenialReason;
}

/** The result of evaluating one requirement against the evidence. */
export type AuthorizationDecision = AuthorizationAllow | AuthorizationDeny;

/** The single, frozen allow — decisions are values, not mutable state. */
export const AUTHORIZATION_ALLOWED: AuthorizationDecision = Object.freeze({ allowed: true });

/** Builds a deny with its reason. */
export function authorizationDenied(reason: AuthorizationDenialReason): AuthorizationDecision {
  return Object.freeze({ allowed: false, reason });
}
