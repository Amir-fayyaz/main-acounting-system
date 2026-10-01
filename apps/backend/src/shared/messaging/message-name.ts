import { validateMatches, validateNonBlank } from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { MessageKind } from './message-kind.js';

/**
 * Naming conventions for the three message kinds, enforced at construction
 * (SHR-003; ADR-005, section 5).
 *
 * A name is the stable identity of a contract: it is what a handler registers
 * against, what a log line and an outbox record carry, and what a consumer of a
 * future version keeps matching on. So the *shape* of the name is checked here
 * rather than left to review:
 *
 * | Kind   | Reads as                    | Example                    |
 * | ------ | --------------------------- | -------------------------- |
 * | Command | imperative intent          | `PostAccountingDocument`   |
 * | Query   | a request for information  | `GetSupplierBalance`       |
 * | Event   | a past-tense fact          | `AccountingDocumentPosted` |
 *
 * The three examples above are the same operation expressed three ways, which
 * is the distinction the rules exist to keep:
 *
 * ```text
 * ApprovePayment   → Command
 * GetPayment       → Query
 * PaymentApproved  → Event
 * ```
 *
 * A trailing `Command`/`Query`/`Event` suffix is allowed and stripped before
 * the semantic check, so `PostAccountingDocumentCommand` and
 * `FiscalYearCreatedEvent` are as valid as their bare forms.
 *
 * What these rules cannot do is decide *meaning*: `CreateFiscalYear` is a
 * perfectly shaped command, but whether the system should have one is the owning
 * module's business. The kernel judges form only — the same line every shared
 * primitive in this folder draws.
 */

/** Longest accepted name; a sanity bound, not a business rule. */
const MAX_NAME_LENGTH = 100;

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

/** The first PascalCase word of a name, e.g. `Get` of `GetSupplierBalance`. */
const FIRST_WORD = /^[A-Z][a-z0-9]*/;

/**
 * Verbs a query may open with (ADR-005, section 5: Get / List / Search / Find
 * "or the precise equivalent"). The list is deliberately short and belongs to
 * the kernel: adding to it is a shared-contract change, not a module decision.
 */
const READ_VERBS = ['Get', 'List', 'Search', 'Find', 'Count', 'Sum', 'Exists'] as const;

/**
 * A command that reads as a fact. The character before `ed` must not be `e`, so
 * real past tenses (`Posted`, `Approved`, `Recorded`, `Created`) are rejected
 * while imperative verbs that merely end in those letters (`SeedDatabase`,
 * `ProceedWithPosting`, `NeedReview`) still pass.
 */
const REGULAR_PAST_TENSE = /[^e]ed$/;

/** An event may end in `ed` or in one of the common irregular past tenses. */
const PAST_TENSE_ENDING = /ed$/;

const IRREGULAR_PAST_TENSES = [
  'Built',
  'Cut',
  'Fed',
  'Held',
  'Kept',
  'Led',
  'Lost',
  'Made',
  'Met',
  'Paid',
  'Put',
  'Run',
  'Sent',
  'Sold',
  'Spent',
  'Won',
] as const;

/** The kind suffix a name may carry, stripped before the semantic check. */
const KIND_SUFFIX: Readonly<Record<MessageKind, string>> = {
  [MessageKind.COMMAND]: 'Command',
  [MessageKind.QUERY]: 'Query',
  [MessageKind.EVENT]: 'Event',
};

/** The primitive an error is reported against, so messages read consistently. */
const KIND_LABEL: Readonly<Record<MessageKind, string>> = {
  [MessageKind.COMMAND]: 'Command',
  [MessageKind.QUERY]: 'Query',
  [MessageKind.EVENT]: 'DomainEvent',
};

/**
 * Validates `name` against the conventions of `kind` and returns it trimmed.
 *
 * @throws InvalidPrimitiveError — a rejected name is a programming error, not a
 * client-facing failure, so it fails loudly exactly like every other primitive.
 */
export function validateMessageName(kind: MessageKind, name: string): string {
  const label = KIND_LABEL[kind];
  const trimmed = validateNonBlank(name, label, 'name');
  validateMatches(
    trimmed,
    PASCAL_CASE,
    label,
    'name',
    'a PascalCase identifier such as "PostAccountingDocument"',
  );

  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new InvalidPrimitiveError(
      label,
      `name must be at most ${MAX_NAME_LENGTH} characters but received ${trimmed.length}`,
    );
  }

  const suffix = KIND_SUFFIX[kind];
  const stem = trimmed.endsWith(suffix) ? trimmed.slice(0, -suffix.length) : trimmed;

  if (stem === '') {
    throw new InvalidPrimitiveError(
      label,
      `name must carry a meaning of its own, not only the "${suffix}" kind suffix`,
    );
  }

  switch (kind) {
    case MessageKind.COMMAND:
      assertNotAReadName(label, stem);
      assertNotAFactName(label, stem);
      break;
    case MessageKind.QUERY:
      if (!startsWithReadVerb(stem)) {
        throw new InvalidPrimitiveError(
          label,
          `name must start with one of ${READ_VERBS.join(', ')} so it reads as a request for ` +
            `information, but received ${JSON.stringify(stem)}`,
        );
      }
      break;
    case MessageKind.EVENT:
      assertNotAReadName(label, stem);
      if (!isPastTense(stem)) {
        throw new InvalidPrimitiveError(
          label,
          `name must be a past-tense fact such as "FiscalYearCreated"; an event states what ` +
            `happened, not what should happen, but received ${JSON.stringify(stem)}`,
        );
      }
      break;
    default:
      throw new InvalidPrimitiveError('Message', `unsupported message kind ${String(kind)}`);
  }

  return trimmed;
}

/** A command asks for work; a name that opens with a read verb asks for data. */
function assertNotAReadName(label: string, stem: string): void {
  if (startsWithReadVerb(stem)) {
    throw new InvalidPrimitiveError(
      label,
      `name must express an imperative intent, but ${JSON.stringify(stem)} starts with a read ` +
        `verb (${READ_VERBS.join(', ')}) — that is a query name (ADR-005, section 5)`,
    );
  }
}

/** A command is requested now; a name that reads as past tense states a fact. */
function assertNotAFactName(label: string, stem: string): void {
  if (REGULAR_PAST_TENSE.test(stem)) {
    throw new InvalidPrimitiveError(
      label,
      `name must be imperative, but ${JSON.stringify(stem)} reads as a past-tense fact — ` +
        `that is an event name (ADR-005, section 5)`,
    );
  }
}

function startsWithReadVerb(stem: string): boolean {
  const firstWord = FIRST_WORD.exec(stem)?.[0] ?? '';
  return (READ_VERBS as readonly string[]).includes(firstWord);
}

function isPastTense(stem: string): boolean {
  if (PAST_TENSE_ENDING.test(stem)) {
    return true;
  }
  return IRREGULAR_PAST_TENSES.some((word) => stem.endsWith(word));
}
