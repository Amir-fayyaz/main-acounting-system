import { AggregateRoot } from './aggregate-root';
import type { DomainEvent } from './domain-event';

class OrderPlaced implements DomainEvent {
  readonly eventName = 'OrderPlaced';
  readonly occurredAt = new Date('2026-01-01T00:00:00.000Z');
  constructor(public readonly orderId: string) {}
}

class OrderShipped implements DomainEvent {
  readonly eventName = 'OrderShipped';
  readonly occurredAt = new Date('2026-01-02T00:00:00.000Z');
  constructor(public readonly orderId: string) {}
}

class Order extends AggregateRoot<string> {
  private constructor(id: string) {
    super(id);
  }

  static create(id: string): Order {
    return new Order(id);
  }

  place(): void {
    this.addDomainEvent(new OrderPlaced(this.id));
  }

  ship(): void {
    this.addDomainEvent(new OrderShipped(this.id));
  }
}

describe('AggregateRoot', () => {
  describe('domain-event lifecycle', () => {
    it('starts with no pending events', () => {
      const order = Order.create('order-1');
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('addDomainEvent appends events to the internal list', () => {
      const order = Order.create('order-1');
      order.place();
      order.ship();

      const events = order.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(OrderPlaced);
      expect((events[0] as OrderPlaced).orderId).toBe('order-1');
      expect(events[1]).toBeInstanceOf(OrderShipped);
    });

    it('getDomainEvents is non-destructive across reads', () => {
      const order = Order.create('order-1');
      order.place();

      expect(order.getDomainEvents()).toHaveLength(1);
      expect(order.getDomainEvents()).toHaveLength(1);
      expect(order.getDomainEvents()).toHaveLength(1);
    });

    it('returns the same event instances on repeated reads', () => {
      const order = Order.create('order-1');
      order.place();

      const [first] = order.getDomainEvents();
      expect(order.getDomainEvents()[0]).toBe(first);
    });

    it('clearEvents empties the recorded list completely', () => {
      const order = Order.create('order-1');
      order.place();
      order.ship();
      expect(order.getDomainEvents()).toHaveLength(2);

      order.clearEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('addDomainEvent after clearEvents starts a fresh batch', () => {
      const order = Order.create('order-1');
      order.place();
      order.clearEvents();
      order.ship();

      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderShipped);
    });

    it('clearEvents on an empty list is a no-op', () => {
      const order = Order.create('order-1');
      order.clearEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('identity equality', () => {
    it('treats two aggregates with the same ID as equal', () => {
      expect(Order.create('order-1').equals(Order.create('order-1'))).toBe(true);
    });

    it('treats two aggregates with different IDs as not equal', () => {
      expect(Order.create('order-1').equals(Order.create('order-2'))).toBe(false);
    });

    it('compares correctly across states', () => {
      // Two aggregates with the same ID should be equal even when their
      // internal state (and event log) differs.
      const a = Order.create('order-1');
      const b = Order.create('order-1');
      a.place();
      b.ship();
      expect(a.equals(b)).toBe(true);
    });
  });
});
