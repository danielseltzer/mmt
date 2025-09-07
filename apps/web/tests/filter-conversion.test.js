import { describe, it, expect } from 'vitest';
import { parseDateExpression, parseSizeExpression } from '../src/utils/filter-utils';

describe('Filter Utils', () => {
  describe('parseDateExpression', () => {
    it('should parse "last X days" expressions', () => {
      const result = parseDateExpression('last 30 days');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>');
      // Value should be an ISO date string 30 days ago
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);
      // Check that the date is approximately correct (within 1 minute)
      const actualDate = new Date(result.value);
      const diff = Math.abs(actualDate.getTime() - expectedDate.getTime());
      expect(diff).toBeLessThan(60000); // Within 1 minute
    });

    it('should parse operator expressions like "< 7 days"', () => {
      const result = parseDateExpression('< 7 days');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>');
      // Value should be an ISO date string 7 days ago
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 7);
      // Check that the date is approximately correct (within 1 minute)
      const actualDate = new Date(result.value);
      const diff = Math.abs(actualDate.getTime() - expectedDate.getTime());
      expect(diff).toBeLessThan(60000); // Within 1 minute
    });

    it('should parse date comparisons like "> 2024-01-01"', () => {
      const result = parseDateExpression('> 2024-01-01');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>');
      // Value should be an ISO date string for 2024-01-01
      expect(result.value).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should parse "since" expressions', () => {
      const result = parseDateExpression('since 2024');
      expect(result).toBeTruthy();
      expect(result.operator).toBe('>=');
      // Value should be an ISO date string for 2024-01-01
      expect(result.value).toBe('2024-01-01T00:00:00.000Z');
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