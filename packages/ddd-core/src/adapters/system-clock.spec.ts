import { SystemClock } from './system-clock';

describe('SystemClock', () => {
  describe('Clock port conformance', () => {
    it('implements the Clock port', () => {
      const clock = new SystemClock();
      expect(typeof clock.now).toBe('function');
    });
  });

  describe('now()', () => {
    it('returns a Date instance', () => {
      const clock = new SystemClock();
      const result = clock.now();

      expect(result).toBeInstanceOf(Date);
    });

    it('returns a valid Date (getTime is a finite number)', () => {
      // A valid Date has a finite epoch millisecond value; an invalid Date
      // returns NaN from getTime().
      const clock = new SystemClock();
      const result = clock.now();

      expect(Number.isNaN(result.getTime())).toBe(false);
    });

    it('returns a timestamp close to the actual current time', () => {
      const clock = new SystemClock();
      const before = Date.now();
      const reported = clock.now().getTime();
      const after = Date.now();

      // The reported timestamp must fall within the window captured around
      // the call — not in the past or the future beyond scheduling jitter.
      expect(reported).toBeGreaterThanOrEqual(before);
      expect(reported).toBeLessThanOrEqual(after);
    });

    it('produces monotonically non-decreasing timestamps across calls', () => {
      const clock = new SystemClock();
      const first = clock.now().getTime();
      const second = clock.now().getTime();

      // System time may advance by zero milliseconds between back-to-back
      // calls, but it must never go backwards.
      expect(second).toBeGreaterThanOrEqual(first);
    });

    it('returns a fresh Date instance on each call', () => {
      const clock = new SystemClock();
      const a = clock.now();
      const b = clock.now();

      // Different references so callers can safely mutate one without
      // affecting the next reading.
      expect(a).not.toBe(b);
    });
  });

  describe('isolation from system clock mutation', () => {
    it('returns the current time at call site, not a captured value', () => {
      const clock = new SystemClock();
      const first = clock.now().getTime();

      // Sleep briefly so system time advances.
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy-wait ~5ms
      }

      const second = clock.now().getTime();
      expect(second).toBeGreaterThan(first);
    });
  });
});
