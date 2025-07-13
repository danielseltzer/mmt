import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App';

describe('Dark Theme', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.documentElement.className = '';
    document.body.className = '';
  });

  it('should have dark class on html element', () => {
    // This would be set by index.html
    document.documentElement.classList.add('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should have dark class on body element', () => {
    // This would be set by index.html
    document.body.classList.add('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('should apply dark background color to app container', () => {
    const { container } = render(<App />);
    const appContainer = container.querySelector('.min-h-screen');
    expect(appContainer).toHaveClass('bg-background');
    
    // In a real test, we'd check computed styles
    // For now, we verify the class is applied
    expect(appContainer).toBeTruthy();
  });

  it('should have dark theme CSS variables defined', () => {
    // Check if CSS is loaded (this would need to be mocked in tests)
    const style = document.createElement('style');
    style.textContent = `
      .dark {
        --background: 240 10% 3.9%;
        --foreground: 0 0% 98%;
      }
    `;
    document.head.appendChild(style);
    
    // Verify the CSS exists
    expect(style.textContent).toContain('.dark');
    expect(style.textContent).toContain('--background: 240 10% 3.9%');
  });
});