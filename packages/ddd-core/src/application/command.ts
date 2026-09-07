/**
 * Marker base class for write intents (commands). Extend it to declare the
 * immutable input of a use case, e.g. `class ConfirmInvoice extends Command`.
 * Using a class (instead of an interface) enables `instanceof` dispatch.
 */
export abstract class Command {}
