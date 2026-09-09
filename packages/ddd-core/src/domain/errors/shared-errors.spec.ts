import { ConflictError } from './conflict.error';
import { DomainError } from './domain.error';
import { InvalidStateError } from './invalid-state.error';
import { InvalidValueError } from './invalid-value.error';
import { NotFoundError } from './not-found.error';
import { UnauthorizedError } from './unauthorized.error';
import { ValidationError } from './validation.error';
import { BusinessRuleValidationError } from './business-rule-validation.error';

describe('shared domain errors', () => {
  describe('inheritance and Error contract', () => {
    const cases = [
      { ctor: NotFoundError, code: 'NOT_FOUND' },
      { ctor: ConflictError, code: 'CONFLICT' },
      { ctor: ValidationError, code: 'VALIDATION_ERROR' },
      { ctor: UnauthorizedError, code: 'UNAUTHENTICATED' },
      { ctor: BusinessRuleValidationError, code: 'BUSINESS_RULE_VIOLATION' },
    ] as const;

    for (const { ctor, code } of cases) {
      describe(ctor.name, () => {
        it('extends DomainError', () => {
          const err = new ctor('boom');
          expect(err).toBeInstanceOf(DomainError);
          expect(err).toBeInstanceOf(Error);
        });

        it('carries the carried message on the Error base', () => {
          const err = new ctor('something went wrong');
          expect(err.message).toBe('something went wrong');
        });

        it(`has code "${code}"`, () => {
          const err = new ctor('boom');
          expect(err.code).toBe(code);
        });

        it('uses the class name as the Error name', () => {
          // The constructor sets `this.name = new.target.name` so the stack
          // trace and downstream serializers carry the concrete subclass,
          // not the generic "Error".
          const err = new ctor('boom');
          expect(err.name).toBe(ctor.name);
        });

        it('preserves a stack trace pointing at the throw site', () => {
          const err = new ctor('boom');
          expect(typeof err.stack).toBe('string');
          expect(err.stack).toContain(ctor.name);
        });

        it('is catchable as a generic Error', () => {
          try {
            throw new ctor('boom');
          } catch (caught) {
            expect(caught).toBeInstanceOf(Error);
            expect(caught).toBeInstanceOf(DomainError);
          }
        });
      });
    }
  });

  describe('preserved errors (InvalidValueError, InvalidStateError)', () => {
    it('InvalidValueError carries INVALID_VALUE and extends DomainError', () => {
      const err = new InvalidValueError('bad amount');
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_VALUE');
      expect(err.message).toBe('bad amount');
    });

    it('InvalidStateError carries INVALID_STATE and extends DomainError', () => {
      const err = new InvalidStateError('cannot transition');
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_STATE');
      expect(err.message).toBe('cannot transition');
    });
  });

  describe('discriminated narrowing', () => {
    it('the `code` field discriminates between error categories', () => {
      const errors: DomainError[] = [
        new NotFoundError('a'),
        new ConflictError('b'),
        new ValidationError('c'),
        new UnauthorizedError('d'),
        new BusinessRuleValidationError('e'),
      ];

      const byCode = new Map<string, DomainError>();
      for (const err of errors) byCode.set(err.code, err);

      expect(byCode.get('NOT_FOUND')?.message).toBe('a');
      expect(byCode.get('CONFLICT')?.message).toBe('b');
      expect(byCode.get('VALIDATION_ERROR')?.message).toBe('c');
      expect(byCode.get('UNAUTHENTICATED')?.message).toBe('d');
      expect(byCode.get('BUSINESS_RULE_VIOLATION')?.message).toBe('e');
    });
  });

  describe('Error base behaviour', () => {
    it('the `code` field is the canonical machine-readable string', () => {
      // Adapters read `code` to map failures to wire envelopes. Confirm
      // every subclass ships a non-empty, stable string — never the
      // placeholder default.
      for (const err of [
        new NotFoundError('a'),
        new ConflictError('b'),
        new ValidationError('c'),
        new UnauthorizedError('d'),
        new BusinessRuleValidationError('e'),
      ]) {
        expect(typeof err.code).toBe('string');
        expect(err.code.length).toBeGreaterThan(0);
        expect(err.code).not.toBe('INTERNAL_ERROR');
      }
    });

    it('subclasses are not interchangeable even with the same message', () => {
      // TypeScript should prevent this at the type level; at runtime a
      // stray `instanceof` check must distinguish the categories.
      const notFound = new NotFoundError('same');
      const conflict = new ConflictError('same');

      expect(notFound).not.toBeInstanceOf(ConflictError);
      expect(conflict).not.toBeInstanceOf(NotFoundError);
      expect(notFound.code).not.toBe(conflict.code);
    });
  });

  describe('BusinessRuleValidationError', () => {
    it('carries an optional ruleId for adapter diagnostics', () => {
      const err = new BusinessRuleValidationError('LIFO requires PAID plan', 'BR-SUB-001');
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(err.message).toBe('LIFO requires PAID plan');
      expect(err.ruleId).toBe('BR-SUB-001');
    });

    it('allows the ruleId to be omitted', () => {
      const err = new BusinessRuleValidationError('rule broken');
      expect(err.ruleId).toBeUndefined();
    });
  });
});
