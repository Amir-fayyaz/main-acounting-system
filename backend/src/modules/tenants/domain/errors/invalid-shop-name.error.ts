import { InvalidValueError } from '@shared/domain/invalid-value.error';

/** Raised when a shop name does not satisfy the ShopName value object rules. */
export class InvalidShopNameError extends InvalidValueError {}
