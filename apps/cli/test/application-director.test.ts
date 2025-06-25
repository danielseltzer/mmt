import { describe, it, expect, beforeEach } from 'vitest';
import { ApplicationDirector } from '../src/application-director.js';

describe('ApplicationDirector Unit Tests', () => {
  let director: ApplicationDirector;

  beforeEach(() => {
    director = new ApplicationDirector();
  });

  it('should be instantiable', () => {
    expect(director).toBeDefined();
    expect(director).toBeInstanceOf(ApplicationDirector);
  });

  it('should have a run method', () => {
    expect(director.run).toBeDefined();
    expect(typeof director.run).toBe('function');
  });

  // Note: We cannot test process.exit behavior without mocks.
  // Integration tests in cli.integration.test.ts handle the full CLI behavior.
  // This is the NO MOCKS way - unit tests only verify structure,
  // integration tests verify behavior with real process execution.
});