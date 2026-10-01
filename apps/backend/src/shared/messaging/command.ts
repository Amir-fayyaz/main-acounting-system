import { MessageKind } from './message-kind.js';
import type { MessageMetadata, MessageOptions } from './message-metadata.js';
import { Message } from './message.js';

/** The JSON-safe shape of a command: envelope plus body. */
export interface CommandSnapshot<TPayload> {
  readonly kind: MessageKind.COMMAND;
  readonly name: string;
  readonly metadata: MessageMetadata;
  readonly payload: TPayload;
}

/**
 * A **command**: the intent to perform an operation (SHR-003; ADR-005,
 * section 2).
 *
 * A command says *what should happen* — `CreateFiscalYear`,
 * `PostAccountingDocument`, `RecordPurchase` — and carries everything the use
 * case needs to decide whether it may: the input, the tenant it acts for and
 * the correlation of the flow that asked. It never carries a result, and it
 * never carries a transport: there is no route, verb or status here, so the
 * same instance is as valid dispatched in-process as handed to a handler
 * later.
 *
 * The command is *not* the work. Executing it is the handler's job, and what
 * comes back is a `Result` (SHR-002) — an expected rejection is a value, a
 * technical fault is a thrown exception. The contract itself has no opinion on
 * either; it is only the ask.
 *
 * Because it is an intent, a command may change state, so it must pass
 * authorization and preconditions at the use case, and the sensitive ones must
 * be idempotent or duplicate-aware (ADR-004, section 11) — an explicit
 * `messageId` in {@link MessageOptions} is the hook for that.
 *
 * ```ts
 * export class PostAccountingDocument extends Command<PostingPayload> {
 *   public constructor(payload: PostingPayload, options?: MessageOptions) {
 *     super('PostAccountingDocument', payload, options);
 *   }
 * }
 * ```
 *
 * Subclasses declare **no fields**: everything travels through the
 * constructor, because the instance is frozen the moment it is built (the same
 * rule `DomainError` follows).
 */
export abstract class Command<TPayload = unknown> extends Message<MessageKind.COMMAND, TPayload> {
  /** The input the operation needs. Plain, self-contained data — frozen on construction. */
  declare public readonly payload: TPayload;

  protected constructor(name: string, payload: TPayload, options?: MessageOptions) {
    super(MessageKind.COMMAND, name, payload, 'payload', options);
  }

  /** The command as plain data: `{ kind, name, metadata, payload }`. */
  public toJSON(): CommandSnapshot<TPayload> {
    return {
      kind: this.kind,
      name: this.name,
      metadata: this.metadata,
      payload: this.payload,
    };
  }
}
