import { MessageKind } from './message-kind.js';
import type { MessageMetadata, MessageOptions } from './message-metadata.js';
import { Message } from './message.js';

/** The JSON-safe shape of a domain event: envelope plus body. */
export interface DomainEventSnapshot<TData> {
  readonly kind: MessageKind.EVENT;
  readonly name: string;
  readonly metadata: MessageMetadata;
  readonly data: TData;
}

/**
 * A **domain event**: a fact that has already happened (SHR-003; ADR-005,
 * section 4).
 *
 * An event says *what happened* — `FiscalYearCreated`,
 * `AccountingDocumentPosted`, `PurchaseRecorded` — in the past tense, because
 * by the time it exists there is nothing left to ask for. The constructor
 * enforces that: `CreateFiscalYear` is refused as an event name, and
 * `FiscalYearCreated` is refused as a command. An event is never a request for
 * someone else to do the work (ADR-005, section 13); work is asked for with a
 * command.
 *
 * Three rules follow from "fact":
 *
 * - **Immutable after creation.** The instance is frozen *and* its `data` is
 *   deep-frozen, so the record of what happened cannot be edited afterwards —
 *   not by a producer, not by a consumer. Pass plain, self-contained values:
 *   never a live entity or a structure the domain still mutates, or freezing
 *   it would reach back into domain state.
 * - **Versioned.** `metadata.version` states which contract version this
 *   instance speaks (ADR-005, section 11); it defaults to `1` and any breaking
 *   change must raise it explicitly, so consumers can evolve without the
 *   producer silently changing meaning under them.
 * - **Traced.** `causedBy(command)` carries the correlation of the flow and the
 *   id of the message that caused this fact, and inherits the tenant, so an
 *   event stays inside the context it was raised in.
 *
 * ```ts
 * export class AccountingDocumentPosted extends DomainEvent<PostedData> {
 *   public constructor(data: PostedData, options?: MessageOptions) {
 *     super('AccountingDocumentPosted', data, options);
 *   }
 * }
 *
 * // in a use case, once the state change has actually succeeded:
 * const raised = new AccountingDocumentPosted(data, causedBy(command));
 * return Result.ok(posted);   // the event travels with the outcome, never instead of it
 * ```
 *
 * Where the event is created matters too: only after a valid state change, from
 * Domain or Application — never from a controller or an integration layer
 * (ADR-005, section 6). Publishing, persistence and delivery are somebody
 * else's problem (out of scope here).
 *
 * Subclasses declare **no fields**: everything travels through the
 * constructor, because the instance is frozen the moment it is built.
 */
export abstract class DomainEvent<TData = unknown> extends Message<MessageKind.EVENT, TData> {
  /** The fact's information. Plain, self-contained data — deep-frozen on construction. */
  declare public readonly data: TData;

  protected constructor(name: string, data: TData, options?: MessageOptions) {
    super(MessageKind.EVENT, name, data, 'data', options);
  }

  /** The event as plain data: `{ kind, name, metadata, data }`. */
  public toJSON(): DomainEventSnapshot<TData> {
    return {
      kind: this.kind,
      name: this.name,
      metadata: this.metadata,
      data: this.data,
    };
  }
}
