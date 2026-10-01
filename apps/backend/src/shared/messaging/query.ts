import { MessageKind } from './message-kind.js';
import type { MessageMetadata, MessageOptions } from './message-metadata.js';
import { Message } from './message.js';

/** The JSON-safe shape of a query: envelope plus body. */
export interface QuerySnapshot<TParams> {
  readonly kind: MessageKind.QUERY;
  readonly name: string;
  readonly metadata: MessageMetadata;
  readonly params: TParams;
}

/**
 * A **query**: a request for information (SHR-003; ADR-005, section 3).
 *
 * A query asks *what do I need to know* — `GetFiscalYear`, `ListAccounts`,
 * `GetSupplierBalance` — and nothing else. From the application's point of view
 * it is side-effect free: it may read a source of truth or a projection, it may
 * be eventually consistent when reporting allows it (ADR-005, section 12), but
 * it never changes domain state. A use case that needs to change something is
 * a command, not a query.
 *
 * The contract is independent of any ORM and of any read model: `params` is
 * plain data, so a query crosses a module boundary the same way a command
 * does — through the owning module's published contract, never through another
 * module's repository or table (ADR-002, section 12).
 *
 * ```ts
 * export class GetSupplierBalance extends Query<{ supplierId: string }> {
 *   public constructor(params: { supplierId: string }, options?: MessageOptions) {
 *     super('GetSupplierBalance', params, options);
 *   }
 * }
 * ```
 *
 * Subclasses declare **no fields**: everything travels through the
 * constructor, because the instance is frozen the moment it is built.
 */
export abstract class Query<TParams = unknown> extends Message<MessageKind.QUERY, TParams> {
  /** The query parameters. Plain, self-contained data — frozen on construction. */
  declare public readonly params: TParams;

  protected constructor(name: string, params: TParams, options?: MessageOptions) {
    super(MessageKind.QUERY, name, params, 'params', options);
  }

  /** The query as plain data: `{ kind, name, metadata, params }`. */
  public toJSON(): QuerySnapshot<TParams> {
    return {
      kind: this.kind,
      name: this.name,
      metadata: this.metadata,
      params: this.params,
    };
  }
}
