import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

/**
 * Supplier business failures (PUR-001).
 *
 * Each error carries a stable code in this module's language so a client can
 * switch on the failure without parsing a message. None of them knows about
 * HTTP: the presentation layer maps a category to a status when an API arrives
 * (for example `CONFLICT` to 409 and `BUSINESS_RULE` to 422).
 */

/** The requested supplier does not exist in this tenant (404 when mapped). */
export class SupplierNotFoundError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_NOT_FOUND', 'No supplier was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
      details: [
        {
          code: 'SUPPLIER_NOT_FOUND',
          field: 'id',
          message: `Supplier "${id}" was not found in the current tenant.`,
        },
      ],
    });
  }
}

/** The supplier exists but is inactive, so the operation is refused (422). */
export class SupplierInactiveError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_INACTIVE', 'The supplier is inactive.', {
      category: ErrorCategory.BUSINESS_RULE,
      details: [
        {
          code: 'SUPPLIER_INACTIVE',
          field: 'status',
          message: `Supplier "${id}" is inactive.`,
        },
      ],
    });
  }
}

/** Another supplier of the same tenant already uses the code (409). */
export class SupplierCodeDuplicateError extends DomainError {
  public constructor(code: string) {
    super('SUPPLIER_CODE_DUPLICATE', 'Another supplier of this company already uses that code.', {
      category: ErrorCategory.CONFLICT,
      details: [
        {
          code: 'SUPPLIER_CODE_DUPLICATE',
          field: 'code',
          message: `Code "${code}" is already in use.`,
        },
      ],
    });
  }
}

/** Another supplier of the same tenant already uses the identification number (409). */
export class SupplierIdentificationDuplicateError extends DomainError {
  public constructor(identificationNumber: string) {
    super(
      'SUPPLIER_IDENTIFICATION_DUPLICATE',
      'Another supplier of this company already uses that identification number.',
      {
        category: ErrorCategory.CONFLICT,
        details: [
          {
            code: 'SUPPLIER_IDENTIFICATION_DUPLICATE',
            field: 'identificationNumber',
            message: `Identification number "${identificationNumber}" is already in use.`,
          },
        ],
      },
    );
  }
}

/** The supplier is already active; activating it again is a state violation. */
export class SupplierAlreadyActiveError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_ALREADY_ACTIVE', 'The supplier is already active.', {
      category: ErrorCategory.STATE_VIOLATION,
      details: [
        {
          code: 'SUPPLIER_ALREADY_ACTIVE',
          field: 'status',
          message: `Supplier "${id}" is already active.`,
        },
      ],
    });
  }
}

/** The supplier is already inactive; deactivating it again is a state violation. */
export class SupplierAlreadyInactiveError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_ALREADY_INACTIVE', 'The supplier is already inactive.', {
      category: ErrorCategory.STATE_VIOLATION,
      details: [
        {
          code: 'SUPPLIER_ALREADY_INACTIVE',
          field: 'status',
          message: `Supplier "${id}" is already inactive.`,
        },
      ],
    });
  }
}
