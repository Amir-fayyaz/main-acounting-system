import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

export class SupplierNotFoundError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_NOT_FOUND', `Supplier "${id}" was not found in the current tenant.`, {
      category: ErrorCategory.NOT_FOUND,
      details: [
        { code: 'SUPPLIER_NOT_FOUND', field: 'id', message: `Supplier "${id}" was not found.` },
      ],
    });
  }
}

export class SupplierInactiveError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_INACTIVE', `Supplier "${id}" is inactive.`, {
      category: ErrorCategory.BUSINESS_RULE,
      details: [
        { code: 'SUPPLIER_INACTIVE', field: 'status', message: `Supplier "${id}" is inactive.` },
      ],
    });
  }
}

export class SupplierCodeDuplicateError extends DomainError {
  public constructor(code: string) {
    super(
      'SUPPLIER_CODE_DUPLICATE',
      `A supplier with code "${code}" already exists in this tenant.`,
      {
        category: ErrorCategory.CONFLICT,
        details: [
          {
            code: 'SUPPLIER_CODE_DUPLICATE',
            field: 'code',
            message: `Code "${code}" is already in use.`,
          },
        ],
      },
    );
  }
}

export class SupplierIdentificationDuplicateError extends DomainError {
  public constructor(identification: string) {
    super(
      'SUPPLIER_IDENTIFICATION_DUPLICATE',
      `A supplier with identification number "${identification}" already exists in this tenant.`,
      {
        category: ErrorCategory.CONFLICT,
        details: [
          {
            code: 'SUPPLIER_IDENTIFICATION_DUPLICATE',
            field: 'identificationNumber',
            message: `Identification number "${identification}" is already in use.`,
          },
        ],
      },
    );
  }
}

export class SupplierAlreadyActiveError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_ALREADY_ACTIVE', `Supplier "${id}" is already active.`, {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

export class SupplierAlreadyInactiveError extends DomainError {
  public constructor(id: string) {
    super('SUPPLIER_ALREADY_INACTIVE', `Supplier "${id}" is already inactive.`, {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}
