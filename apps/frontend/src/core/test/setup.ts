import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// پاکسازی DOM بعد از هر تست، تا کامپوننت‌های قبلی باقی نمانند
afterEach(() => {
  cleanup();
});

// jsdom پیاده‌سازی elementFromPoint را ندارد؛ input-otp به آن نیاز دارد
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
