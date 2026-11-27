import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

export class ItemCodeDuplicateError extends DomainError {
  public constructor() {
    super('ITEM_CODE_DUPLICATE', 'Another item of this company already uses that code.', {
      category: ErrorCategory.CONFLICT,
    });
  }
}

export class ItemBarcodeDuplicateError extends DomainError {
  public constructor() {
    super('ITEM_BARCODE_DUPLICATE', 'Another item of this company already uses that barcode.', {
      category: ErrorCategory.CONFLICT,
    });
  }
}

export class ItemNotFoundError extends DomainError {
  public constructor() {
    super('ITEM_NOT_FOUND', 'No item was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

export class ItemInactiveError extends DomainError {
  public constructor() {
    super('ITEM_INACTIVE', 'The item is inactive.', { category: ErrorCategory.BUSINESS_RULE });
  }
}

export class ItemUnitInvalidError extends DomainError {
  public constructor() {
    super('ITEM_UNIT_INVALID', 'Choose a unit from the system unit list.', {
      category: ErrorCategory.VALIDATION,
    });
  }
}

export class ItemUnitImmutableError extends DomainError {
  public constructor() {
    super('ITEM_UNIT_IMMUTABLE', 'The unit of an existing item cannot be changed.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

export class ItemAlreadyActiveError extends DomainError {
  public constructor() {
    super('ITEM_ALREADY_ACTIVE', 'The item is already active.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

export class ItemAlreadyInactiveError extends DomainError {
  public constructor() {
    super('ITEM_ALREADY_INACTIVE', 'The item is already inactive.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}
