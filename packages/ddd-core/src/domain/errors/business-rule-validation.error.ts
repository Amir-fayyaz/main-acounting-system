import { DomainError } from './domain.error';

/**
 * Thrown when input is structurally valid but violates a named business
 * rule documented in `wiki/domain/business-rules.md` (BR-REPORT-002,
 * BR-TENANT-001, …). Adapters translate this to a 422 response carrying
 * the rule id so the UI can surface a meaningful message.
 *
 * Use {@link InvalidValueError} for malformed input and
 * {@link ValidationError} for generic shape failures; this error is
 * reserved for "the input is fine in isolation, but it breaks a domain
 * invariant when combined with the current state".
 */
export class BusinessRuleValidationError extends DomainError {
  constructor(
    message: string,
    readonly ruleId?: string,
  ) {
    super(message, 'BUSINESS_RULE_VIOLATION');
  }
}
