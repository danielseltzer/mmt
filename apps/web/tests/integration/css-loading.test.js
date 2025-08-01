import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CSS Loading', () => {
  let cssContent;

  beforeAll(() => {
    // Read the globals.css file
    const cssPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'src', 'globals.css');
    cssContent = fs.readFileSync(cssPath, 'utf-8');
  });

  it('should contain dark theme CSS variables', () => {
    expect(cssContent).toContain('.dark {');
    expect(cssContent).toContain('--background: 240 10% 3.9%');
    expect(cssContent).toContain('--foreground: 0 0% 98%');
  });

  it('should contain base layer styles', () => {
    expect(cssContent).toContain('@layer base');
    // Check for CSS variables instead of specific properties
    expect(cssContent).toContain('--background:');
    expect(cssContent).toContain('--foreground:');
  });

  it('should import Tailwind directives', () => {
    expect(cssContent).toContain('@tailwind base');
    expect(cssContent).toContain('@tailwind components');
    expect(cssContent).toContain('@tailwind utilities');
  });
});