import { AggregateRoot } from './aggregate-root';
import type { DomainEvent } from './domain-event';

class OrderPlaced implements DomainEvent {
  readonly eventName = 'OrderPlaced';
  readonly occurredAt = new Date('2026-01-01T00:00:00.000Z');
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
    this.addEvent(new OrderPlaced(this.id));
  }
}

describe('AggregateRoot', () => {
  it('collects domain events and exposes them via pullEvents', () => {
    const order = Order.create('order-1');
    order.place();
    order.place();

    const events = order.pullEvents();
    expect(events).toHaveLength(2);
    expect(events[0]).toBeInstanceOf(OrderPlaced);
    expect((events[0] as OrderPlaced).orderId).toBe('order-1');
  });

  it('clears pending events after pullEvents', () => {
    const order = Order.create('order-1');
    order.place();

    expect(order.pullEvents()).toHaveLength(1);
    expect(order.pullEvents()).toHaveLength(0);
  });

  it('compares aggregates by identity', () => {
    expect(Order.create('order-1').equals(Order.create('order-1'))).toBe(true);
    expect(Order.create('order-1').equals(Order.create('order-2'))).toBe(false);
  });
});
