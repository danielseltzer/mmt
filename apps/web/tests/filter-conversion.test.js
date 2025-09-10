import { describe, it, expect } from 'vitest';
import { parseDateExpression, parseSizeExpression } from '../src/utils/filter-utils';

describe('Filter Utils', () => {
  describe('parseDateExpression', () => {
    it('should parse "last X days" expressions', () => {
      const result = parseDateExpression('last 30 days');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>');
      // Value should be a relative date string like "-30d"
      expect(result.value).toBe('-30d');
    });

    it('should parse operator expressions like "< 7 days"', () => {
      const result = parseDateExpression('< 7 days');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>');
      // Value should be a relative date string like "-7d"
      expect(result.value).toBe('-7d');
    });

    it('should parse date comparisons like "> 2024-01-01"', () => {
      const result = parseDateExpression('> 2024-01-01');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>');
      // Value should be the date string as-is
      expect(result.value).toBe('2024-01-01');
    });

    it('should parse "since" expressions', () => {
      const result = parseDateExpression('since 2024');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>=');
      // Value should be the year as-is
      expect(result.value).toBe('2024');
    });

    it('should return null for invalid expressions', () => {
      expect(parseDateExpression('invalid')).toBeNull();
      expect(parseDateExpression('')).toBeNull();
      // Note: parseDateExpression expects a string, not null
      // This would be a TypeScript error in the actual implementation
    });
  });

  describe('parseSizeExpression', () => {
    it('should parse "over X" expressions', () => {
      const result = parseSizeExpression('over 1mb');
      expect(result).toEqual({ operator: '>', value: '1048576' });
    });

    it('should parse "under X" expressions', () => {
      const result = parseSizeExpression('under 10k');
      expect(result).toEqual({ operator: '<', value: '10240' });
    });

    it('should parse operator expressions like "> 100k"', () => {
      const result = parseSizeExpression('> 100k');
      expect(result).toEqual({ operator: '>', value: '102400' });
    });

    it('should handle different size units', () => {
      expect(parseSizeExpression('over 1k')).toEqual({ operator: '>', value: '1024' });
      expect(parseSizeExpression('over 1m')).toEqual({ operator: '>', value: '1048576' });
      expect(parseSizeExpression('over 1g')).toEqual({ operator: '>', value: '1073741824' });
    });

    it('should return null for invalid expressions', () => {
      expect(parseSizeExpression('invalid')).toBeNull();
      expect(parseSizeExpression('')).toBeNull();
      // Note: parseSizeExpression expects a string, not null
      // This would be a TypeScript error in the actual implementation
    });
  });
});