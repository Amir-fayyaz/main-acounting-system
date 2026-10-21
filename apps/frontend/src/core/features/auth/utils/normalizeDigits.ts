/** ارقام فارسی (۰-۹) و عربی (٠-٩) را به انگلیسی تبدیل می‌کند. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}
