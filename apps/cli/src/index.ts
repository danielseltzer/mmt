#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for MMT.
 * 
 * This file is the executable entry point when users run `mmt`.
 * It creates an ApplicationDirector and passes command-line arguments.
 */

import { ApplicationDirector } from './application-director.js';

const director = new ApplicationDirector();

// Run with command-line arguments (excluding node and script path)
director.run(process.argv.slice(2)).catch(() => {
  // Error already handled and logged by director
  // Just ensure we exit with error code
  process.exit(1);
});