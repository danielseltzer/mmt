import { describe, it, expect } from 'vitest';

describe('Date Parsing', () => {
  it('should parse ISO date strings correctly', () => {
    const isoString = '2025-07-09T21:57:38.511Z';
    const date = new Date(isoString);
    
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).not.toBeNaN();
    expect(date.toISOString()).toBe(isoString);
  });

  it('should format dates for display', () => {
    const isoString = '2025-07-09T21:57:38.511Z';
    const date = new Date(isoString);
    
    // Test US locale formatting
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    expect(formatted).toMatch(/Jul 9, 2025/);
  });

  it('should handle invalid date strings', () => {
    const invalidDate = new Date('invalid-date');
    expect(invalidDate.getTime()).toBeNaN();
  });
});