import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, on, off, emit, once } from '../js/event-bus.js';

describe('EventBus', () => {
  beforeEach(() => {
    // Reset by removing all listeners
    for (const event of ['test', 'other', 'error-test']) {
      off(event, () => {});
    }
  });

  it('should emit events to listeners', () => {
    let received = null;
    on('test', (data) => { received = data; });
    emit('test', 'hello');
    expect(received).toBe('hello');
  });

  it('should support multiple listeners for same event', () => {
    let count = 0;
    on('test', () => { count++; });
    on('test', () => { count++; });
    emit('test', null);
    expect(count).toBe(2);
  });

  it('should remove specific listener with off()', () => {
    let count = 0;
    const fn = () => { count++; };
    on('test', fn);
    emit('test', null);
    expect(count).toBe(1);
    off('test', fn);
    emit('test', null);
    expect(count).toBe(1);
  });

  it('should not fail when emitting event with no listeners', () => {
    expect(() => emit('nonexistent', null)).not.toThrow();
  });

  it('should not fail when removing from non-existent event', () => {
    expect(() => off('nonexistent', () => {})).not.toThrow();
  });

  it('once() should fire only once', () => {
    let count = 0;
    once('test', () => { count++; });
    emit('test', null);
    emit('test', null);
    expect(count).toBe(1);
  });

  it('should catch handler errors without breaking other handlers', () => {
    let secondCalled = false;
    on('error-test', () => { throw new Error('boom'); });
    on('error-test', () => { secondCalled = true; });
    emit('error-test', null);
    expect(secondCalled).toBe(true);
  });

  it('should pass data objects correctly', () => {
    let received = null;
    on('test', (data) => { received = data; });
    const payload = { features: { volume: 0.5 }, currentTime: 10 };
    emit('test', payload);
    expect(received).toEqual(payload);
  });
});
