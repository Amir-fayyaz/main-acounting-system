export interface SupplierContactInfoProps {
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
  readonly postalCode?: string | null;
}

/**
 * Contact and location details of a supplier.
 */
export class SupplierContactInfo {
  public readonly phone?: string;
  public readonly email?: string;
  public readonly address?: string;
  public readonly postalCode?: string;

  private constructor(props: SupplierContactInfoProps) {
    this.phone = props.phone?.trim() || undefined;
    this.email = props.email?.trim() || undefined;
    this.address = props.address?.trim() || undefined;
    this.postalCode = props.postalCode?.trim() || undefined;
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
