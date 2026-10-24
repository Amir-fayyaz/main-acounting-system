export function getImageUrl(path?: string | null): string {
  if (!path) return '';

  // اگر blob باشه (آدرس موقت مرورگر) همون رو برگردون
  if (path.startsWith('blob:')) {
    return path;
  }

  // اگر کامل باشه
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // اگر با / شروع شده
  if (path.startsWith('/')) {
    return `http://localhost:3000${path}`;
  }

  // فقط اسم فایل
  return `http://localhost:3000/uploads/products/${path}`;
}
