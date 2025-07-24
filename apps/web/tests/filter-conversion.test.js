import { describe, it, expect } from 'vitest';
import { parseDateExpression, parseSizeExpression } from '../src/utils/filter-utils';

describe('Filter Utils', () => {
  describe('parseDateExpression', () => {
    it('should parse "last X days" expressions', () => {
      const result = parseDateExpression('last 30 days');
      expect(result).toEqual({ operator: 'gt', value: '-30d' });
    });

    it('should parse operator expressions like "< 7 days"', () => {
      const result = parseDateExpression('< 7 days');
      expect(result).toEqual({ operator: 'gt', value: '-7d' });
    });

    it('should parse date comparisons like "> 2024-01-01"', () => {
      const result = parseDateExpression('> 2024-01-01');
      expect(result).toEqual({ operator: 'gt', value: '2024-01-01' });
    });

    it('should parse "since" expressions', () => {
      const result = parseDateExpression('since 2024');
      expect(result).toEqual({ operator: 'gte', value: '2024' });
    });

    it('should return null for invalid expressions', () => {
      expect(parseDateExpression('invalid')).toBeNull();
      expect(parseDateExpression('')).toBeNull();
      expect(parseDateExpression(null)).toBeNull();
    });
  });

  describe('parseSizeExpression', () => {
    it('should parse "over X" expressions', () => {
      const result = parseSizeExpression('over 1mb');
      expect(result).toEqual({ operator: 'gt', value: '1048576' });
    });

    it('should parse "under X" expressions', () => {
      const result = parseSizeExpression('under 10k');
      expect(result).toEqual({ operator: 'lt', value: '10240' });
    });

    it('should parse operator expressions like "> 100k"', () => {
      const result = parseSizeExpression('> 100k');
      expect(result).toEqual({ operator: 'gt', value: '102400' });
    });

    it('should handle different size units', () => {
      expect(parseSizeExpression('over 1k')).toEqual({ operator: 'gt', value: '1024' });
      expect(parseSizeExpression('over 1m')).toEqual({ operator: 'gt', value: '1048576' });
      expect(parseSizeExpression('over 1g')).toEqual({ operator: 'gt', value: '1073741824' });
    });

    it('should return null for invalid expressions', () => {
      expect(parseSizeExpression('invalid')).toBeNull();
      expect(parseSizeExpression('')).toBeNull();
      expect(parseSizeExpression(null)).toBeNull();
    });
  });
});