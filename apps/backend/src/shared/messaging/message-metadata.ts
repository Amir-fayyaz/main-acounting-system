import { randomUUID } from 'node:crypto';

import {
  describeValue,
  validateIntegerInRange,
  validateMatches,
  validateNonBlank,
} from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';

/**
 * The transport-free metadata every message carries (SHR-003).
 *
 * The seven fields are exactly what the architecture needs to route, trace and
 * reason about a message — and nothing else. No business concept appears here;
 * a field such as "customer" or "period" belongs in the message body, owned by
 * the module that defined it (ADR-002, section 10).
 *
 * ```text
 * messageId      who this message is            (idempotency key, deduplication)
 * messageType    what contract it is            (stable name, e.g. "PostAccountingDocument")
 * timestamp      when it was raised             (ISO 8601, UTC)
 * version        which contract version         (event evolution, ADR-005 section 11)
 * tenantId       whose data it concerns         (isolation context)
 * correlationId  which flow it belongs to       (one id across a whole request/flow)
 * causationId    which message triggered it     (the immediate cause)
 * ```
 *
 * Everything is a plain, JSON-safe value, so the same metadata works in a
 * `Result` returned in-process, in an outbox row and — if the presentation
 * layer ever chooses — in a log line. No HTTP status, header or transport type
 * is referenced anywhere.
 *
 * Tenant context deserves a word of its own: `tenantId` is *resolved by the
 * application layer from the authenticated principal*, never copied from a
 * request body or any other client-supplied field. The contract only promises
 * that whatever the application resolved travels with the message; deciding
 * who the caller is, and whether they may act for that tenant, stays an
 * application/security concern (ADR-010).
 */

/** Highest contract version a message may declare; a sanity bound, not a rule. */
export const MAX_MESSAGE_VERSION = 9999;

/**
 * Identifiers are short and opaque: letters, digits, `.`, `_`, `:` and `-`, at
 * most 128 characters. The bound keeps a caller from injecting an unbounded or
 * structured value (an object, a payload, a query) into an id field.
 */
const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]{1,128}$/;
const IDENTIFIER_EXPECTATION =
  'a short opaque identifier of at most 128 characters ' + '(letters, digits, ".", "_", ":", "-")';

/** ISO 8601 in UTC, e.g. `2026-10-02T09:30:00.000Z`. A local offset is refused. */
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const TIMESTAMP_EXPECTATION = 'an ISO 8601 UTC instant such as "2026-10-02T09:30:00.000Z"';

/** The stable, serializable shape of a message's metadata. */
export interface MessageMetadata {
  readonly messageId: string;
  readonly messageType: string;
  readonly timestamp: string;
  readonly version: number;
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}

/**
 * What a caller may pin when raising a message. Everything is optional: the
 * kernel supplies an id, a timestamp and version 1 when the caller says
 * nothing, so a plain `new SomeCommand(payload)` is already a complete,
 * traceable message.
 *
 * An explicit `messageId` is the hook for idempotency (ADR-004, section 11):
 * re-raising the same logical operation with the same id lets a consumer
 * recognise the duplicate.
 */
export interface MessageOptions {
  readonly messageId?: string;
  readonly timestamp?: string;
  readonly version?: number;
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}

type MutableMetadata = {
  -readonly [K in keyof MessageMetadata]: MessageMetadata[K];
};

/**
 * Validates the options, fills the defaults and returns a frozen metadata
 * object.
 *
 * @throws InvalidPrimitiveError — an id that is blank or not opaque, a
 * timestamp that is not a UTC instant, or a version outside `1..9999` are all
 * programming errors, rejected rather than repaired.
 */
export function createMessageMetadata(
  messageType: string,
  options?: MessageOptions,
): MessageMetadata {
  const type = validateNonBlank(messageType, 'MessageMetadata', 'messageType');
  const messageId =
    options?.messageId === undefined
      ? randomUUID()
      : validateIdentifier(options.messageId, 'messageId');
  const timestamp =
    options?.timestamp === undefined
      ? new Date().toISOString()
      : validateTimestamp(options.timestamp);
  const version = validateIntegerInRange(
    options?.version ?? 1,
    1,
    MAX_MESSAGE_VERSION,
    'MessageMetadata',
    'version',
  );

  const metadata: MutableMetadata = { messageId, messageType: type, timestamp, version };

  if (options?.tenantId !== undefined) {
    metadata.tenantId = validateIdentifier(options.tenantId, 'tenantId');
  }
  if (options?.correlationId !== undefined) {
    metadata.correlationId = validateIdentifier(options.correlationId, 'correlationId');
  }
  if (options?.causationId !== undefined) {
    metadata.causationId = validateIdentifier(options.causationId, 'causationId');
  }

  return Object.freeze(metadata);
}

function validateIdentifier(value: string, field: string): string {
  return validateMatches(
    validateNonBlank(value, 'MessageMetadata', field),
    SAFE_IDENTIFIER,
    'MessageMetadata',
    field,
    IDENTIFIER_EXPECTATION,
  );
}

function validateTimestamp(value: string): string {
  const trimmed = validateNonBlank(value, 'MessageMetadata', 'timestamp');
  if (!UTC_TIMESTAMP.test(trimmed) || Number.isNaN(Date.parse(trimmed))) {
    throw new InvalidPrimitiveError(
      'MessageMetadata',
      `timestamp must be ${TIMESTAMP_EXPECTATION} but received ${describeValue(value)}`,
    );
  }
  return trimmed;
}
