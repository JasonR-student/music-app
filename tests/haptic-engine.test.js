import { describe, it, expect } from 'vitest';
import { HapticEngine } from '../js/haptic-engine.js';

describe('HapticEngine', () => {
  describe('supported()', () => {
    it('should return a boolean', () => {
      expect(typeof HapticEngine.supported()).toBe('boolean');
    });
  });

  describe('isEnabled()', () => {
    it('should default to false', () => {
      expect(HapticEngine.isEnabled()).toBe(false);
    });
  });

  describe('getIntensity() / setIntensity()', () => {
    it('should default to 0.5', () => {
      expect(HapticEngine.getIntensity()).toBe(0.5);
    });

    it('should clamp to 0-1 range', () => {
      HapticEngine.setIntensity(1.5);
      expect(HapticEngine.getIntensity()).toBe(1);

      HapticEngine.setIntensity(-0.5);
      expect(HapticEngine.getIntensity()).toBe(0);

      HapticEngine.setIntensity(0.7);
      expect(HapticEngine.getIntensity()).toBe(0.7);

      HapticEngine.setIntensity(0.5);
    });
  });

  describe('enable() / disable()', () => {
    it('shnable() returns false in Node environment (no navigator.vibrate)', () => {
      const result = HapticEngine.enable();
      expect(result).toBe(false);
    });

    it('disable() should not throw', () => {
      expect(() => HapticEngine.disable()).not.toThrow();
    });
  });
});
