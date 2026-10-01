/**
 * What a message *is* — the single discriminator that keeps the three kinds of
 * application communication apart (SHR-003; ADR-005, section 1).
 *
 * ```text
 * COMMAND → "What should the system do?"  (intent, may change state)
 * QUERY   → "What information do I need?" (read, no business side effect)
 * EVENT   → "What happened?"              (a fact that already occurred)
 * ```
 *
 * The kind is a property of the *contract*, not of the transport: the same
 * values describe a message handled in-process today and one that later travels
 * through an outbox and a stream. Nothing here knows about HTTP, Redis or a
 * broker — those decide how a message is carried, never what it means.
 */
export enum MessageKind {
  COMMAND = 'command',
  QUERY = 'query',
  EVENT = 'event',
}
