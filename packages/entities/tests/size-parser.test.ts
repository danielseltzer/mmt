import { describe, it, expect } from 'vitest';
import { parseSizeExpression, describeSizeFilter } from '../src/size-parser.js';

describe('parseSizeExpression', () => {
  describe('comparison patterns', () => {
    it('should parse "under X"', () => {
      expect(parseSizeExpression('under 10k')).toEqual({
        operator: '<',
        value: '10240'
      });
    });

    it('should parse "over X"', () => {
      expect(parseSizeExpression('over 1mb')).toEqual({
        operator: '>',
        value: '1048576'
      });
    });

    it('should parse "less than X"', () => {
      expect(parseSizeExpression('less than 5mb')).toEqual({
        operator: '<',
        value: '5242880'
      });
    });

    it('should parse "greater than X"', () => {
      expect(parseSizeExpression('greater than 100k')).toEqual({
        operator: '>',
        value: '102400'
      });
    });

    it('should parse "larger than X"', () => {
      expect(parseSizeExpression('larger than 2gb')).toEqual({
        operator: '>',
        value: '2147483648'
      });
    });

    it('should parse "at least X"', () => {
      expect(parseSizeExpression('at least 1k')).toEqual({
        operator: '>=',
        value: '1024'
      });
    });

    it('should parse "at most X"', () => {
      expect(parseSizeExpression('at most 10mb')).toEqual({
        operator: '<=',
        value: '10485760'
      });
    });
  });

  describe('size units', () => {
    it('should parse bytes', () => {
      expect(parseSizeExpression('100')).toEqual({
        operator: '>=',
        value: '100'
      });
      expect(parseSizeExpression('100b')).toEqual({
        operator: '>=',
        value: '100'
      });
      expect(parseSizeExpression('100 bytes')).toEqual({
        operator: '>=',
        value: '100'
      });
    });

    it('should parse kilobytes', () => {
      expect(parseSizeExpression('10k')).toEqual({
        operator: '>=',
        value: '10240'
      });
      expect(parseSizeExpression('10kb')).toEqual({
        operator: '>=',
        value: '10240'
      });
      expect(parseSizeExpression('10 kilobytes')).toEqual({
        operator: '>=',
        value: '10240'
      });
    });

    it('should parse megabytes', () => {
      expect(parseSizeExpression('1m')).toEqual({
        operator: '>=',
        value: '1048576'
      });
      expect(parseSizeExpression('1mb')).toEqual({
        operator: '>=',
        value: '1048576'
      });
      expect(parseSizeExpression('1 meg')).toEqual({
        operator: '>=',
        value: '1048576'
      });
      expect(parseSizeExpression('1 megabyte')).toEqual({
        operator: '>=',
        value: '1048576'
      });
    });

    it('should parse gigabytes', () => {
      expect(parseSizeExpression('2g')).toEqual({
        operator: '>=',
        value: '2147483648'
      });
      expect(parseSizeExpression('2gb')).toEqual({
        operator: '>=',
        value: '2147483648'
      });
      expect(parseSizeExpression('2 gigs')).toEqual({
        operator: '>=',
        value: '2147483648'
      });
    });

    it('should parse decimal values', () => {
      expect(parseSizeExpression('1.5mb')).toEqual({
        operator: '>=',
        value: '1572864'
      });
      expect(parseSizeExpression('0.5k')).toEqual({
        operator: '>=',
        value: '512'
      });
    });
  });

  describe('between patterns', () => {
    it('should parse "between X and Y"', () => {
      // For now, returns lower bound
      expect(parseSizeExpression('between 1k and 10k')).toEqual({
        operator: '>=',
        value: '1024'
      });
    });
  });

  describe('operator syntax', () => {
    it('should parse "> 10mb"', () => {
      expect(parseSizeExpression('> 10mb')).toEqual({
        operator: '>',
        value: '10485760'
      });
    });

    it('should parse "<= 500k"', () => {
      expect(parseSizeExpression('<= 500k')).toEqual({
        operator: '<=',
        value: '512000'
      });
    });

    it('should parse ">= 1.5gb"', () => {
      expect(parseSizeExpression('>= 1.5gb')).toEqual({
        operator: '>=',
        value: '1610612736'
      });
    });

    it('should parse "< 100"', () => {
      expect(parseSizeExpression('< 100')).toEqual({
        operator: '<',
        value: '100'
      });
    });
  });

  describe('edge cases', () => {
    it('should return null for empty input', () => {
      expect(parseSizeExpression('')).toBeNull();
      expect(parseSizeExpression('  ')).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(parseSizeExpression('invalid size')).toBeNull();
      expect(parseSizeExpression('not a size')).toBeNull();
      expect(parseSizeExpression('10 invalid-unit')).toBeNull();
    });

    it('should be case insensitive', () => {
      expect(parseSizeExpression('UNDER 10K')).toBeTruthy();
      expect(parseSizeExpression('Over 1MB')).toBeTruthy();
      expect(parseSizeExpression('AT LEAST 5GB')).toBeTruthy();
    });

    it('should handle spaces between number and unit', () => {
      expect(parseSizeExpression('10 k')).toEqual({
        operator: '>=',
        value: '10240'
      });
      expect(parseSizeExpression('1   mb')).toEqual({
        operator: '>=',
        value: '1048576'
      });
    });
  });
});

describe('describeSizeFilter', () => {
  it('should describe > operator', () => {
    const filter = { operator: '>' as const, value: '1048576' };
    expect(describeSizeFilter(filter)).toBe('larger than 1 MB');
  });

  it('should describe >= operator', () => {
    const filter = { operator: '>=' as const, value: '1024' };
    expect(describeSizeFilter(filter)).toBe('at least 1 KB');
  });

  it('should describe < operator', () => {
    const filter = { operator: '<' as const, value: '10240' };
    expect(describeSizeFilter(filter)).toBe('smaller than 10 KB');
  });

  it('should describe <= operator', () => {
    const filter = { operator: '<=' as const, value: '5242880' };
    expect(describeSizeFilter(filter)).toBe('at most 5 MB');
  });
});