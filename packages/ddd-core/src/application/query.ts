/**
 * Marker base class for read intents (queries). Extend it to declare the
 * immutable input of a read use case. Using a class (instead of an interface)
 * enables `instanceof` dispatch.
 */
export abstract class Query {}
