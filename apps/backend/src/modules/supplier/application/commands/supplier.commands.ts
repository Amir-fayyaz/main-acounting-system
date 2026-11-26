import type { SupplierActorPrincipal } from '../ports/supplier-authorization.port.js';

export interface CreateSupplierInput {
  readonly code: string;
  readonly name: string;
  readonly identificationNumber?: string;
  readonly contactInfo?: {
    readonly phone?: string | null;
    readonly email?: string | null;
    readonly address?: string | null;
    readonly postalCode?: string | null;
  };
  readonly confirmDuplicate?: boolean;
  readonly principal?: SupplierActorPrincipal;
}

export class CreateSupplierCommand {
  public constructor(public readonly payload: CreateSupplierInput) {}
}

export interface UpdateSupplierInput {
  readonly id: string;
  readonly expectedRevision: number;
  readonly code?: string;
  readonly name?: string;
  readonly identificationNumber?: string | null;
  readonly contactInfo?: {
    readonly phone?: string | null;
    readonly email?: string | null;
    readonly address?: string | null;
    readonly postalCode?: string | null;
  } | null;
  readonly principal?: SupplierActorPrincipal;
}

export class UpdateSupplierCommand {
  public constructor(public readonly payload: UpdateSupplierInput) {}
}

export interface DeactivateSupplierInput {
  readonly id: string;
  readonly expectedRevision: number;
  readonly principal?: SupplierActorPrincipal;
}

export class DeactivateSupplierCommand {
  public constructor(public readonly payload: DeactivateSupplierInput) {}
}

export interface ActivateSupplierInput {
  readonly id: string;
  readonly expectedRevision: number;
  readonly principal?: SupplierActorPrincipal;
}

export class ActivateSupplierCommand {
  public constructor(public readonly payload: ActivateSupplierInput) {}
}
