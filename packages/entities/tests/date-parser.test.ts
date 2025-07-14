import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseDateExpression, describeDateFilter } from '../src/date-parser.js';

describe('parseDateExpression', () => {
  // Mock current date for consistent testing
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('relative past patterns', () => {
    it('should parse "last X days"', () => {
      const result = parseDateExpression('last 30 days');
      expect(result).toEqual({
        operator: '>',
        value: new Date('2024-05-16T12:00:00Z').toISOString()
      });
    });

    it('should parse "past X days"', () => {
      const result = parseDateExpression('past 7 days');
      expect(result).toEqual({
        operator: '>',
        value: new Date('2024-06-08T12:00:00Z').toISOString()
      });
    });

    it('should parse "yesterday"', () => {
      const result = parseDateExpression('yesterday');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-14')).toBe(true);
    });

    it('should parse "last week"', () => {
      const result = parseDateExpression('last week');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-08')).toBe(true);
    });

    it('should parse "last month"', () => {
      const result = parseDateExpression('last month');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-05-15')).toBe(true);
    });

    it('should parse "last year"', () => {
      const result = parseDateExpression('last year');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2023-06-15')).toBe(true);
    });
  });

  describe('current period patterns', () => {
    it('should parse "today"', () => {
      const result = parseDateExpression('today');
      expect(result?.operator).toBe('>=');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-15')).toBe(true);
    });

    it('should parse "this week"', () => {
      const result = parseDateExpression('this week');
      expect(result?.operator).toBe('>=');
      // June 15, 2024 is a Saturday, so start of week (Sunday) is June 9
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-09')).toBe(true);
    });

    it('should parse "this month"', () => {
      const result = parseDateExpression('this month');
      expect(result?.operator).toBe('>=');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-01')).toBe(true);
    });

    it('should parse "this year"', () => {
      const result = parseDateExpression('this year');
      expect(result?.operator).toBe('>=');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-01-01')).toBe(true);
    });
  });

  describe('since/after patterns', () => {
    it('should parse "since YYYY"', () => {
      const result = parseDateExpression('since 2023');
      expect(result).toEqual({
        operator: '>=',
        value: new Date('2023-01-01T00:00:00.000Z').toISOString()
      });
    });

    it('should parse "after January"', () => {
      const result = parseDateExpression('after january');
      expect(result?.operator).toBe('>=');
      const date = new Date(result!.value);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCFullYear()).toBe(2024); // Current year
    });

    it('should parse "since March 2023"', () => {
      const result = parseDateExpression('since march 2023');
      expect(result?.operator).toBe('>=');
      const date = new Date(result!.value);
      expect(date.getUTCMonth()).toBe(2); // March
      expect(date.getUTCFullYear()).toBe(2023);
    });
  });

  describe('before/until patterns', () => {
    it('should parse "before 2025"', () => {
      const result = parseDateExpression('before 2025');
      expect(result).toEqual({
        operator: '<',
        value: new Date('2025-01-01T00:00:00.000Z').toISOString()
      });
    });

    it('should parse "until December"', () => {
      const result = parseDateExpression('until december');
      expect(result?.operator).toBe('<');
      const date = new Date(result!.value);
      expect(date.getUTCMonth()).toBe(11); // December
      expect(date.getUTCFullYear()).toBe(2024); // Current year
    });
  });

  describe('shorthand relative dates', () => {
    it('should parse "-30d"', () => {
      const result = parseDateExpression('-30d');
      expect(result).toEqual({
        operator: '>',
        value: new Date('2024-05-16T12:00:00Z').toISOString()
      });
    });

    it('should parse "30d" (without sign)', () => {
      const result = parseDateExpression('30d');
      expect(result).toEqual({
        operator: '>',
        value: new Date('2024-05-16T12:00:00Z').toISOString()
      });
    });

    it('should parse "+7d"', () => {
      const result = parseDateExpression('+7d');
      expect(result).toEqual({
        operator: '<',
        value: new Date('2024-06-22T12:00:00Z').toISOString()
      });
    });

    it('should parse "2w"', () => {
      const result = parseDateExpression('2w');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-01')).toBe(true);
    });

    it('should parse "-3m"', () => {
      const result = parseDateExpression('-3m');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-03-15')).toBe(true);
    });

    it('should parse "1y"', () => {
      const result = parseDateExpression('1y');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2023-06-15')).toBe(true);
    });
  });

  describe('operator syntax', () => {
    it('should parse "> 2024-01-01"', () => {
      const result = parseDateExpression('> 2024-01-01');
      expect(result).toEqual({
        operator: '>',
        value: new Date('2024-01-01').toISOString()
      });
    });

    it('should parse "<= 2023-12-31"', () => {
      const result = parseDateExpression('<= 2023-12-31');
      expect(result).toEqual({
        operator: '<=',
        value: new Date('2023-12-31').toISOString()
      });
    });

    it('should parse ">= yesterday"', () => {
      const result = parseDateExpression('>= yesterday');
      expect(result?.operator).toBe('>=');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-14')).toBe(true);
    });

    it('should parse "< last week"', () => {
      const result = parseDateExpression('< last week');
      expect(result?.operator).toBe('<');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-08')).toBe(true);
    });
  });

  describe('relative time with operators', () => {
    it('should parse "< 7 days" (within last 7 days)', () => {
      const result = parseDateExpression('< 7 days');
      expect(result).toEqual({
        operator: '>',
        value: new Date('2024-06-08T12:00:00Z').toISOString()
      });
    });

    it('should parse "> 30 days" (older than 30 days)', () => {
      const result = parseDateExpression('> 30 days');
      expect(result).toEqual({
        operator: '<',
        value: new Date('2024-05-16T12:00:00Z').toISOString()
      });
    });

    it('should parse "< 2 weeks"', () => {
      const result = parseDateExpression('< 2 weeks');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-01')).toBe(true);
    });

    it('should parse "> 3 months"', () => {
      const result = parseDateExpression('> 3 months');
      expect(result?.operator).toBe('<');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-03-15')).toBe(true);
    });

    it('should parse "< 1 year"', () => {
      const result = parseDateExpression('< 1 year');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2023-06-15')).toBe(true);
    });

    it('should parse shorthand "< 7d"', () => {
      const result = parseDateExpression('< 7d');
      expect(result).toEqual({
        operator: '>',
        value: new Date('2024-06-08T12:00:00Z').toISOString()
      });
    });

    it('should parse shorthand "< 2w"', () => {
      const result = parseDateExpression('< 2w');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-06-01')).toBe(true);
    });

    it('should parse shorthand "> 3m"', () => {
      const result = parseDateExpression('> 3m');
      expect(result?.operator).toBe('<');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2024-03-15')).toBe(true);
    });

    it('should parse shorthand "< 1y"', () => {
      const result = parseDateExpression('< 1y');
      expect(result?.operator).toBe('>');
      const date = new Date(result!.value);
      expect(date.toISOString().startsWith('2023-06-15')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return null for empty input', () => {
      expect(parseDateExpression('')).toBeNull();
      expect(parseDateExpression('  ')).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(parseDateExpression('invalid date')).toBeNull();
      expect(parseDateExpression('not a date')).toBeNull();
    });

    it('should be case insensitive', () => {
      expect(parseDateExpression('LAST 30 DAYS')).toBeTruthy();
      expect(parseDateExpression('Since 2024')).toBeTruthy();
      expect(parseDateExpression('THIS MONTH')).toBeTruthy();
    });
  });
});

describe('describeDateFilter', () => {
  it('should describe > operator', () => {
    const filter = { operator: '>' as const, value: '2024-01-01T00:00:00Z' };
    expect(describeDateFilter(filter)).toContain('after');
  });

  it('should describe >= operator', () => {
    const filter = { operator: '>=' as const, value: '2024-01-01T00:00:00Z' };
    expect(describeDateFilter(filter)).toContain('since');
  });

  it('should describe < operator', () => {
    const filter = { operator: '<' as const, value: '2024-01-01T00:00:00Z' };
    expect(describeDateFilter(filter)).toContain('before');
  });

  it('should describe <= operator', () => {
    const filter = { operator: '<=' as const, value: '2024-01-01T00:00:00Z' };
    expect(describeDateFilter(filter)).toContain('until');
  });
});