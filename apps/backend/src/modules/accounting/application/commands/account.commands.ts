import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

export interface CreateAccountPayload {
  readonly code: string;
  readonly name: string;
  readonly parentId?: string | null;
  readonly type: string;
  readonly normalBalance?: string;
  readonly postable?: boolean;
  readonly active?: boolean;
  readonly system?: boolean;
}

export interface UpdateAccountPayload {
  readonly id: string;
  readonly code?: string;
  readonly name?: string;
  readonly parentId?: string | null;
  readonly type?: string;
  readonly normalBalance?: string;
  readonly postable?: boolean;
  readonly active?: boolean;
  readonly revision?: number;
}

export interface DeactivateAccountPayload {
  readonly id: string;
  readonly revision?: number;
}

export interface ReactivateAccountPayload {
  readonly id: string;
  readonly revision?: number;
}

export interface DeleteAccountPayload {
  readonly id: string;
}

export class CreateAccount extends Command<CreateAccountPayload> {
  public constructor(payload: CreateAccountPayload, options?: MessageOptions) {
    super('CreateAccount', payload, options);
  }
}

export class UpdateAccount extends Command<UpdateAccountPayload> {
  public constructor(payload: UpdateAccountPayload, options?: MessageOptions) {
    super('UpdateAccount', payload, options);
  }
}

export class DeactivateAccount extends Command<DeactivateAccountPayload> {
  public constructor(payload: DeactivateAccountPayload, options?: MessageOptions) {
    super('DeactivateAccount', payload, options);
  }
}

export class ReactivateAccount extends Command<ReactivateAccountPayload> {
  public constructor(payload: ReactivateAccountPayload, options?: MessageOptions) {
    super('ReactivateAccount', payload, options);
  }
}

export class DeleteAccount extends Command<DeleteAccountPayload> {
  public constructor(payload: DeleteAccountPayload, options?: MessageOptions) {
    super('DeleteAccount', payload, options);
  }
}
