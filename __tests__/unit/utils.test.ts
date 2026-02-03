import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('foo', 'bar');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });

    it('should handle conditional classes', () => {
      const result = cn('foo', false && 'bar', 'baz');
      expect(result).toContain('foo');
      expect(result).not.toContain('bar');
      expect(result).toContain('baz');
    });

    it('should merge Tailwind classes correctly', () => {
      const result = cn('p-4 p-6', 'bg-red-500');
      expect(result).toContain('p-6'); // Should keep the last p-* class
      expect(result).toContain('bg-red-500');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle undefined and null', () => {
      const result = cn('foo', undefined, null, 'bar');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });
  });
});
