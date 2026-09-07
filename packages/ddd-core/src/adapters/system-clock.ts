import type { Clock } from '../domain/ports/clock.port';

/** Production adapter for the Clock port backed by the system time. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
