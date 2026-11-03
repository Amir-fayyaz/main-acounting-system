import { EntityId } from '../../../../shared/id/entity-id.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

import { AccountCode } from '../value-objects/account-code.js';
import { AccountType } from '../value-objects/account-type.js';
import { NormalBalance } from '../value-objects/account-normal-balance.js';
import {
  AccountInvalidParentError,
  AccountTypeMismatchError,
  AccountNormalBalanceMismatchError,
  AccountPostableWithChildrenError,
  AccountPostableNotLeafError,
  AccountSystemProtectedError,
} from '../errors/account.errors.js';

/** The plain snapshot of an Account, as storage and mapping see it. */
export interface AccountSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly level: number;
  readonly parentId: string | null;
  readonly type: string;
  readonly normalBalance: string;
  readonly postable: boolean;
  readonly active: boolean;
  readonly system: boolean;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

/** Input for creating a root account. */
export interface CreateRootAccountInput {
  readonly id?: string;
  readonly tenantId: string;
  readonly code: AccountCode;
  readonly name: string;
  readonly type: AccountType;
  readonly normalBalance: NormalBalance;
  readonly postable: boolean;
  readonly active: boolean;
  readonly system: boolean;
  readonly now: DateTime;
}

/** Input for creating a child account. */
export interface CreateChildAccountInput {
  readonly parent: Account;
  readonly code: AccountCode;
  readonly name: string;
  readonly type: AccountType;
  readonly normalBalance: NormalBalance;
  readonly postable: boolean;
  readonly active: boolean;
  readonly system: boolean;
  readonly now: DateTime;
  readonly id?: string;
  readonly tenantId: string; // <-- added
}

export class Account {
  private constructor(
    private readonly _id: EntityId,
    private readonly _tenantId: string,
    private readonly _code: AccountCode,
    private _name: string,
    private _level: number,
    private readonly _parentId: string | null,
    private readonly _type: AccountType,
    private readonly _normalBalance: NormalBalance,
    private _postable: boolean,
    private _active: boolean,
    private readonly _system: boolean,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
    private _childCount: number,
  ) {}

  /**
   * Creates a new root account (level 1, no parent).
   *
   * @throws AccountPostableNotLeafError — a root account cannot be postable if it has children
   * @throws AccountSystemProtectedError — a system account cannot be postable or active
   * @throws InvalidPrimitiveError — name is blank
   */
  public static create(input: CreateRootAccountInput): Account {
    const id = input.id ? EntityId.from(input.id) : EntityId.generate();

    validateName(input.name);
    validateSystemAccount(input);
    // A new root has no children, so postable is allowed

    return new Account(
      id,
      input.tenantId,
      input.code,
      input.name.trim(),
      1,
      null,
      input.type,
      input.normalBalance,
      input.postable,
      input.active,
      input.system,
      input.now,
      input.now,
      0, // new root has no children yet
    );
  }

  /**
   * Creates a new child account under a parent.
   *
   * The child's level, type, and normal balance are always derived from the parent.
   * The child inherits the parent's tenant identity.
   *
   * @throws AccountInvalidParentError — parent belongs to a different tenant
   * @throws AccountLevelMismatchError — level is always parent.level + 1 (enforced by construction)
   * @throws AccountTypeMismatchError — child type must equal parent type
   * @throws AccountNormalBalanceMismatchError — child normal balance must equal parent's
   * @throws AccountPostableWithChildrenError — parent is postable, cannot receive children
   * @throws AccountSystemProtectedError — child is marked as system and is postable/active
   * @throws InvalidPrimitiveError — name is blank
   */
  public static createAsChild(input: CreateChildAccountInput): Account {
    const { parent, tenantId } = input;

    validateName(input.name);
    validateSystemAccount(input);

    // Check tenant first (as close to original design as possible)
    if (parent._tenantId !== tenantId) {
      throw new AccountInvalidParentError();
    }

    // Then check type and normal balance
    if (parent._type.value !== input.type.value) {
      throw new AccountTypeMismatchError(input.type.value, parent._type.value);
    }

    if (parent._normalBalance.value !== input.normalBalance.value) {
      throw new AccountNormalBalanceMismatchError(input.normalBalance.value, parent._normalBalance.value);
    }

    if (parent._postable) {
      throw new AccountPostableWithChildrenError();
    }

    const id = input.id ? EntityId.from(input.id) : EntityId.generate();

    // New child starts with no children of its own, postable flag as given
    return new Account(
      id,
      parent._tenantId, // child inherits parent's tenant
      input.code,
      input.name.trim(),
      parent._level + 1,
      parent._id.value,
      input.type,
      input.normalBalance,
      input.postable,
      input.active,
      input.system,
      input.now,
      input.now,
      0, // new child has no children yet
    );
  }

  /**
   * Rebuilds an Account from stored state.
   *
   * Values are re-validated through their value objects.
   */
  public static rehydrate(snapshot: AccountSnapshot): Account {
    return new Account(
      EntityId.from(snapshot.id),
      snapshot.tenantId,
      AccountCode.from(snapshot.code),
      snapshot.name,
      snapshot.level,
      snapshot.parentId,
      AccountType.from(snapshot.type),
      NormalBalance.from(snapshot.normalBalance),
      snapshot.postable,
      snapshot.active,
      snapshot.system,
      snapshot.createdAt,
      snapshot.updatedAt,
      // Child count is not persisted in the snapshot for the base account;
      // the application layer tracks it separately or infers from the tree.
      0,
    );
  }

  // Getters

  public get id(): EntityId {
    return this._id;
  }

  public get tenantId(): string {
    return this._tenantId;
  }

  public get code(): AccountCode {
    return this._code;
  }

  public get name(): string {
    return this._name;
  }

  public get level(): number {
    return this._level;
  }

  public get parentId(): string | null {
    return this._parentId;
  }

  public get type(): AccountType {
    return this._type;
  }

  public get normalBalance(): NormalBalance {
    return this._normalBalance;
  }

  public get postable(): boolean {
    return this._postable;
  }

  public get active(): boolean {
    return this._active;
  }

  public get system(): boolean {
    return this._system;
  }

  public get createdAt(): DateTime {
    return this._createdAt;
  }

  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** Number of direct children this account has (for invariant enforcement). */
  public get childCount(): number {
    return this._childCount;
  }

  /**
   * Adds a child account to this account.
   *
   * @throws AccountPostableWithChildrenError — this account is postable and cannot receive children
   */
  public addChild(_child: Account): void {
    if (this._postable) {
      throw new AccountPostableWithChildrenError();
    }
    this._childCount += 1;
  }

  /**
   * Renames the account.
   *
   * @throws AccountSystemProtectedError — account is a system account
   * @throws InvalidPrimitiveError — name is blank
   */
  public rename(name: string, now: DateTime): void {
    if (this._system) {
      throw new AccountSystemProtectedError();
    }
    validateName(name);
    this._name = name.trim();
    this._updatedAt = now;
  }

  /**
   * Changes the postable status.
   *
   * @throws AccountSystemProtectedError — account is a system account
   * @throws AccountPostableNotLeafError — account has children and cannot be postable
   */
  public setPostable(postable: boolean, now: DateTime): void {
    if (this._system) {
      throw new AccountSystemProtectedError();
    }

    if (postable && this._childCount > 0) {
      throw new AccountPostableNotLeafError();
    }

    this._postable = postable;
    this._updatedAt = now;
  }

  /**
   * Changes the active status.
   *
   * @throws AccountSystemProtectedError — account is a system account
   */
  public setActive(active: boolean, now: DateTime): void {
    if (this._system) {
      throw new AccountSystemProtectedError();
    }

    this._active = active;
    this._updatedAt = now;
  }

  public snapshot(): AccountSnapshot {
    return {
      id: this._id.value,
      tenantId: this._tenantId,
      code: this._code.value,
      name: this._name,
      level: this._level,
      parentId: this._parentId,
      type: this._type.value,
      normalBalance: this._normalBalance.value,
      postable: this._postable,
      active: this._active,
      system: this._system,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

/** Validation helpers */

function validateName(name: string): void {
  if (!name || name.trim() === '') {
    throw new InvalidPrimitiveError('Account', 'name must not be blank');
  }
}

function validateSystemAccount(input: {
  readonly system: boolean;
  readonly postable: boolean;
  readonly active: boolean;
  readonly now: DateTime;
}): void {
  if (input.system) {
    if (input.postable) {
      throw new AccountSystemProtectedError();
    }
    if (input.active) {
      throw new AccountSystemProtectedError();
    }
  }
}