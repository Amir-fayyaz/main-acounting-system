import { MessageKind } from './message-kind.js';
import {
  createMessageMetadata,
  type MessageMetadata,
  type MessageOptions,
} from './message-metadata.js';
import { validateMessageName } from './message-name.js';

/**
 * The property a message body is exposed under. Each kind uses the word its own
 * vocabulary calls it — a command has a `payload`, a query `params`, an event
 * `data` — while the envelope around it stays identical.
 */
type MessageBodyKey = 'payload' | 'params' | 'data';

/**
 * The shared shape of a Command, a Query and a Domain Event (SHR-003;
 * ADR-005).
 *
 * ```text
 * Command  → intent:   what should the system do?
 * Query    → read:     what information do I need?
 * Event    → fact:     what happened?
 * ```
 *
 * All three are the same envelope — `kind` + stable `name` + `metadata` plus a
 * body of plain data — and differ only in what they *mean*, which is why the
 * meaning is enforced by the constructor rather than by convention:
 * {@link validateMessageName} refuses a fact-shaped command and an
 * intent-shaped event before an instance ever exists.
 *
 * Three properties are worth stating because they are what make the contract
 * usable across module boundaries:
 *
 * - **Nothing transport-shaped.** No HTTP verb, status, header, Redis stream or
 *   ORM type appears in the envelope; a message is carried by whatever the
 *   application later chooses. The kernel only guarantees the metadata above is
 *   serializable.
 * - **No business meaning.** The kernel knows a message has *a* body, never
 *   what is in it. Which commands, queries and events exist — and what they
 *   carry — is the owning module's published contract (ADR-002, section 12).
 * - **A value snapshot.** The instance is frozen and the body deep-frozen, so a
 *   message cannot be rewritten after it was raised: an event stays the fact it
 *   was recorded as, and a handler cannot mutate a command mid-flight. Pass
 *   plain, self-contained data — never a live entity or a structure another
 *   part of the system still mutates.
 *
 * The constructor also fixes the exception boundary inherited from SHR-002:
 * a message *represents* expected work; a technical fault is still thrown, never
 * smuggled in as a message. And the body is data, not a callback — nothing here
 * executes anything.
 */
export abstract class Message<TKind extends MessageKind, TBody> {
  /** Which of the three kinds this message is. */
  public readonly kind: TKind;

  /** The stable contract name, e.g. `PostAccountingDocument`. */
  public readonly name: string;

  /** Identity, timing, tenant and tracing context — see {@link MessageMetadata}. */
  public readonly metadata: MessageMetadata;

  protected constructor(
    kind: TKind,
    name: string,
    body: TBody,
    bodyKey: MessageBodyKey,
    options?: MessageOptions,
  ) {
    this.kind = kind;
    this.name = validateMessageName(kind, name);
    this.metadata = createMessageMetadata(this.name, options);

    // The body is installed under the key its kind reads it by, as an own
    // property, so it enumerates and serializes like any other field even
    // though the base class cannot name it.
    Object.defineProperty(this, bodyKey, {
      value: body,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    deepFreeze(body);
    Object.freeze(this);
  }
}

/**
 * The metadata that links a new message to the one that produced it.
 *
 * ```ts
 * new AccountingDocumentPosted(data, causedBy(command));
 * ```
 *
 * `causationId` becomes the causing message's id (the *immediate* cause),
 * `correlationId` is inherited when the cause has one and otherwise defaults to
 * the cause's own id, so one flow shares a single correlation across every hop.
 * The tenant is inherited for the same reason: an effect of a tenant-scoped
 * command stays inside that tenant (ADR-008, section 13).
 *
 * `overrides` always wins, which is how a caller re-correlates a message or
 * states an id of its own — for example an idempotency key (ADR-004,
 * section 11).
 */
export function causedBy(
  source: Message<MessageKind, unknown>,
  overrides: MessageOptions = {},
): MessageOptions {
  const { metadata } = source;

  return {
    ...overrides,
    correlationId: overrides.correlationId ?? metadata.correlationId ?? metadata.messageId,
    causationId: overrides.causationId ?? metadata.messageId,
    tenantId: overrides.tenantId ?? metadata.tenantId,
  };
}

/**
 * Freezes a body and everything reachable from it, so a message really is
 * immutable after creation rather than only at its top level.
 *
 * - Cycles are walked once (`seen`), so a self-referencing body terminates.
 * - Accessor properties are not read — only data descriptors are followed — so
 *   freezing never executes code that happens to live on the body.
 * - Non-objects (a string, a number, `null`) are returned from immediately.
 */
function deepFreeze(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && 'value' in descriptor) {
      deepFreeze(descriptor.value, seen);
    }
  }

  Object.freeze(value);
}
