import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/** The optional contact fields a supplier may carry (PUR-001). */
export interface SupplierContactInfoProps {
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
  readonly postalCode?: string | null;
}

/**
 * Optional contact data for a supplier.
 *
 * Contact data is descriptive, not identifying: it is not part of the duplicate
 * rule and it may be changed freely. Blank values are treated as absent so a
 * form that submits empty strings does not create a second representation of
 * "no phone number".
 */
export class SupplierContactInfo {
  public readonly phone?: string;
  public readonly email?: string;
  public readonly address?: string;
  public readonly postalCode?: string;

  private constructor(props: SupplierContactInfoProps) {
    this.phone = optionalText(props.phone, 'phone');
    this.email = optionalText(props.email, 'email');
    this.address = optionalText(props.address, 'address');
    this.postalCode = optionalText(props.postalCode, 'postalCode');
  }

  public static create(props: SupplierContactInfoProps): SupplierContactInfo {
    return new SupplierContactInfo(props);
  }

  public toJSON(): SupplierContactInfoProps {
    return {
      phone: this.phone,
      email: this.email,
      address: this.address,
      postalCode: this.postalCode,
    };
  }
}

function optionalText(value: string | null | undefined, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new InvalidPrimitiveError(
      'SupplierContactInfo',
      `${field} must be a string but received ${describeValue(value)}`,
    );
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
