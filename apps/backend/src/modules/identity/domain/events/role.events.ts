import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { MembershipRoleStatusValue } from '../value-objects/membership-role-status.js';
import type { RoleStatusValue } from '../value-objects/role-status.js';

/**
 * The role and role-assignment facts this module publishes (IAM-004; ADR-005).
 *
 * Every one of them is tenant-scoped and carries the `tenantId`: a role belongs
 * to a tenant and an assignment is access data inside it, so the tenant is part
 * of what happened and is stamped from the ambient tenant scope
 * (`tenantScopedMessageOptions`) rather than copied from a client field. That is
 * what lets a later authorization/read model react to "this membership gained
 * this capability" without re-reading the aggregates.
 *
 * Their bodies are plain, self-contained values — never the aggregate itself —
 * so the record of what happened cannot be edited after the fact. Each is raised
 * by a use case only after the state change actually happened, and travels
 * through the outbox in the same transaction (SHR-006).
 *
 * Names are past tense because an event is a fact; the kernel refuses anything
 * else.
 */

/** The information `RoleCreated` carries. */
export interface RoleCreatedData {
  readonly roleId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly permissions: readonly string[];
}

/** A new role was created within a tenant. */
export class RoleCreated extends DomainEvent<RoleCreatedData> {
  public constructor(data: RoleCreatedData, options?: MessageOptions) {
    super('RoleCreated', data, options);
  }
}

/** The information `RoleRenamed` carries. */
export interface RoleRenamedData {
  readonly roleId: string;
  readonly tenantId: string;
  readonly name: string;
}

/** A role's name changed. */
export class RoleRenamed extends DomainEvent<RoleRenamedData> {
  public constructor(data: RoleRenamedData, options?: MessageOptions) {
    super('RoleRenamed', data, options);
  }
}

/** The information `RoleStatusChanged` carries. */
export interface RoleStatusChangedData {
  readonly roleId: string;
  readonly tenantId: string;
  readonly from: RoleStatusValue;
  readonly to: RoleStatusValue;
}

/** A role's lifecycle state moved (activate / deactivate). */
export class RoleStatusChanged extends DomainEvent<RoleStatusChangedData> {
  public constructor(data: RoleStatusChangedData, options?: MessageOptions) {
    super('RoleStatusChanged', data, options);
  }
}

/** The information `RolePermissionGranted` carries. */
export interface RolePermissionGrantedData {
  readonly roleId: string;
  readonly tenantId: string;
  readonly permission: string;
}

/** A capability was granted to a role. */
export class RolePermissionGranted extends DomainEvent<RolePermissionGrantedData> {
  public constructor(data: RolePermissionGrantedData, options?: MessageOptions) {
    super('RolePermissionGranted', data, options);
  }
}

/** The information `RolePermissionRevoked` carries. */
export interface RolePermissionRevokedData {
  readonly roleId: string;
  readonly tenantId: string;
  readonly permission: string;
}

/** A capability was removed from a role. */
export class RolePermissionRevoked extends DomainEvent<RolePermissionRevokedData> {
  public constructor(data: RolePermissionRevokedData, options?: MessageOptions) {
    super('RolePermissionRevoked', data, options);
  }
}

/** The information `RoleAssigned` carries. */
export interface RoleAssignedData {
  readonly assignmentId: string;
  readonly tenantId: string;
  readonly membershipId: string;
  readonly roleId: string;
}

/** A role began being held by a membership. */
export class RoleAssigned extends DomainEvent<RoleAssignedData> {
  public constructor(data: RoleAssignedData, options?: MessageOptions) {
    super('RoleAssigned', data, options);
  }
}

/** The information `RoleUnassigned` carries. */
export interface RoleUnassignedData {
  readonly assignmentId: string;
  readonly tenantId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly status: MembershipRoleStatusValue;
}

/** A role stopped being held by a membership (the assignment is retained). */
export class RoleUnassigned extends DomainEvent<RoleUnassignedData> {
  public constructor(data: RoleUnassignedData, options?: MessageOptions) {
    super('RoleUnassigned', data, options);
  }
}
