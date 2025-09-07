import { describe, it, expect } from 'vitest';
import { formatDocumentCount } from '../src/utils/format-utils';

describe('formatDocumentCount', () => {
  it('should return numbers <= 999 as-is', () => {
    expect(formatDocumentCount(0)).toBe('0');
    expect(formatDocumentCount(1)).toBe('1');
    expect(formatDocumentCount(100)).toBe('100');
    expect(formatDocumentCount(500)).toBe('500');
    expect(formatDocumentCount(999)).toBe('999');
  });

  it('should format 1000 as "1.0k"', () => {
    expect(formatDocumentCount(1000)).toBe('1.0k');
  });

  it('should format numbers > 999 with one decimal place', () => {
    expect(formatDocumentCount(1001)).toBe('1.0k');
    expect(formatDocumentCount(1100)).toBe('1.1k');
    expect(formatDocumentCount(1500)).toBe('1.5k');
    expect(formatDocumentCount(1950)).toBe('1.9k'); // Should be 1.9k, not 2.0k
    expect(formatDocumentCount(1999)).toBe('1.9k'); // Truncates to 1.9k
    expect(formatDocumentCount(5992)).toBe('5.9k'); // Should be 5.9k
    expect(formatDocumentCount(12345)).toBe('12.3k');
  });

  it('should handle truncation correctly', () => {
    // Test truncation at various thresholds  
    expect(formatDocumentCount(1049)).toBe('1.0k'); // 1.049 truncates to 1.0
    expect(formatDocumentCount(1050)).toBe('1.0k'); // 1.050 truncates to 1.0
    expect(formatDocumentCount(1100)).toBe('1.1k'); // 1.100 truncates to 1.1
    expect(formatDocumentCount(1949)).toBe('1.9k'); // 1.949 truncates to 1.9
    expect(formatDocumentCount(1950)).toBe('1.9k'); // 1.950 truncates to 1.9
    expect(formatDocumentCount(9949)).toBe('9.9k'); // 9.949 truncates to 9.9
    expect(formatDocumentCount(9950)).toBe('9.9k'); // 9.950 truncates to 9.9
  });

  it('should handle large numbers correctly', () => {
    expect(formatDocumentCount(10000)).toBe('10.0k');
    expect(formatDocumentCount(50000)).toBe('50.0k');
    expect(formatDocumentCount(99999)).toBe('99.9k'); // Truncates to 99.9k
    expect(formatDocumentCount(100000)).toBe('100.0k');
    expect(formatDocumentCount(999999)).toBe('999.9k'); // Truncates to 999.9k
  });
});