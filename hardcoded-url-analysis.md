# Hardcoded URL Analysis and Config Migration Proposal

## Executive Summary

The codebase contains 29 hardcoded URL violations across multiple categories. These violations contradict the NO DEFAULTS principle and should be moved to explicit configuration. This document analyzes the violations and proposes specific config-based alternatives.

## Categories of Hardcoded URLs

### 1. **API Server URLs** (7 violations)
- **Location**: `apps/api-server/src/server.ts`, `apps/control-manager/src/control-manager.ts`
- **Purpose**: Logging and health checks for API server
- **Current**: `http://localhost:${config.apiPort}`
- **Issue**: Hardcoded `localhost` assumes local deployment

### 2. **Web UI URLs** (6 violations)  
- **Location**: `apps/web/src/config/api.ts`, `apps/control-manager/src/control-manager.ts`
- **Purpose**: API base URL for frontend, control manager URLs
- **Current**: `http://localhost:3001`, `http://localhost:5173`
- **Issue**: Cannot deploy to different hosts or use HTTPS

### 3. **Similarity Service URLs** (8 violations)
- **Location**: Test files and config schema defaults
- **Purpose**: Ollama and Qdrant service endpoints
- **Current**: `http://localhost:11434` (Ollama), `http://localhost:6333` (Qdrant)
- **Issue**: Defaults violate NO DEFAULTS policy

### 4. **Test/Tool URLs** (8 violations)
- **Location**: Various test and tool files
- **Purpose**: E2E tests, browser health checks, debugging tools
- **Current**: `http://localhost:5173`, `http://localhost:3001`
- **Issue**: Tests cannot run against different environments

## Current Config Structure

The existing config schema (`packages/entities/src/config.schema.ts`) already has:
- `apiPort`: Port for API server
- `webPort`: Port for web server  
- `similarity.ollamaUrl`: URL for Ollama (but has default!)
- `similarity.qdrant.url`: URL for Qdrant (but has default!)

## Proposed Config Schema Changes

### 1. Add Server Configuration Section

```typescript
export const ServerConfigSchema = z.object({
  /**
   * Host configuration for API and web servers
   * Must be explicitly configured - no defaults
   */
  host: z.object({
    /**
     * Hostname or IP address for binding servers
     * Examples: 'localhost', '0.0.0.0', '192.168.1.100'
     */
    bind: z.string().describe('Host to bind servers to'),
    
    /**
     * Public URL base for API server (without port)
     * Used for constructing full URLs in logs and clients
     * Examples: 'http://localhost', 'https://api.myapp.com'
     */
    apiUrl: z.string().url().describe('Public URL for API server'),
    
    /**
     * Public URL base for web UI (without port)
     * Examples: 'http://localhost', 'https://app.myapp.com'
     */
    webUrl: z.string().url().describe('Public URL for web UI'),
  }),
  
  /**
   * Existing port configuration
   */
  apiPort: z.number().int().min(1).max(65535),
  webPort: z.number().int().min(1).max(65535),
});
```

### 2. Remove ALL Defaults from Similarity Config

```typescript
export const SimilarityConfigSchema = z.object({
  enabled: z.boolean(),  // Remove .default(false)
  provider: z.enum(['qdrant']).optional(),  // Remove .default('qdrant')
  
  // Remove ALL defaults - require explicit configuration
  ollamaUrl: z.string().url(),  // Remove .default('http://localhost:11434')
  model: z.string(),  // Remove .default('nomic-embed-text')
  
  qdrant: z.object({
    url: z.string().url(),  // Remove .default('http://localhost:6333')
    collectionName: z.string(),  // Remove .default('documents')
    onDisk: z.boolean(),  // Remove .default(false)
  }).optional(),
});
```

### 3. Add Test Environment Config

```typescript
export const TestConfigSchema = ConfigSchema.extend({
  /**
   * Test-specific configuration
   * Only used when running tests
   */
  test: z.object({
    /**
     * Override URLs for test environments
     */
    apiUrl: z.string().url().optional(),
    webUrl: z.string().url().optional(),
    
    /**
     * Browser testing configuration
     */
    browser: z.object({
      headless: z.boolean(),
      timeout: z.number(),
    }).optional(),
  }).optional(),
});
```

## Implementation Strategy

### Phase 1: Update Config Schema
1. Add `ServerConfigSchema` with host configuration
2. Remove ALL defaults from `SimilarityConfigSchema`
3. Update `ConfigSchema` to include server config

### Phase 2: Update Config Loading
1. Modify `ConfigService` to reject configs with missing required fields
2. Add clear error messages for missing configuration
3. Update config validation to enforce NO DEFAULTS

### Phase 3: Update Code to Use Config
1. **API Server**: Use `config.host.apiUrl` instead of hardcoded localhost
2. **Web UI**: Read API URL from server config endpoint
3. **Control Manager**: Use configured URLs for health checks
4. **Tests**: Load URLs from test config or environment

### Phase 4: Update Test Infrastructure  
1. Create test config files with explicit URLs
2. Update E2E tests to read URLs from config
3. Update tools to accept URL parameters

## Example Config File

```yaml
# config.yaml - ALL fields explicitly configured
vaults:
  - name: Personal
    path: /Users/me/Documents/notes
    indexPath: /Users/me/.mmt/notes-index

# Server configuration - REQUIRED
host:
  bind: "0.0.0.0"  # Bind to all interfaces
  apiUrl: "http://localhost"  # Public API URL
  webUrl: "http://localhost"  # Public web URL

apiPort: 3001
webPort: 5173

# Similarity configuration - ALL fields required when enabled
similarity:
  enabled: true
  provider: qdrant
  ollamaUrl: "http://localhost:11434"
  model: "nomic-embed-text"
  qdrant:
    url: "http://localhost:6333"
    collectionName: "documents"
    onDisk: false
```

## Files Requiring Updates

### High Priority (Core functionality)
1. `/apps/api-server/src/server.ts` - Remove hardcoded localhost in log
2. `/apps/web/src/config/api.ts` - Use configured API URL
3. `/apps/control-manager/src/control-manager.ts` - Use configured URLs
4. `/packages/entities/src/config.schema.ts` - Remove ALL defaults

### Medium Priority (Tests)
1. All files in `/tests/e2e/*.test.ts` - Use test config
2. `/apps/api-server/tests/**/*.test.ts` - Use test config
3. `/apps/web/tests/**/*.test.{ts,tsx,js}` - Use test config

### Low Priority (Tools)
1. `/tools/check-browser-health.js` - Accept URL as parameter
2. `/tools/test-*.js` - Accept URL as parameter or use config

## Benefits of This Approach

1. **Explicit Configuration**: All URLs must be explicitly configured (NO DEFAULTS)
2. **Deployment Flexibility**: Can deploy to any host/port combination
3. **HTTPS Support**: Can use HTTPS URLs when deployed
4. **Test Flexibility**: Tests can run against any environment
5. **Docker Support**: Can configure for containerized deployments
6. **Multi-Environment**: Different configs for dev/staging/prod

## Migration Checklist

- [ ] Update config schema to remove ALL defaults
- [ ] Add server host configuration section
- [ ] Update ConfigService validation
- [ ] Update API server to use configured URLs
- [ ] Update web UI to fetch API URL from config
- [ ] Update control manager URL construction
- [ ] Create example config files with all required fields
- [ ] Update documentation with new config requirements
- [ ] Update all tests to use explicit config
- [ ] Update tools to accept URL parameters

## Key Principle Compliance

This proposal fully adheres to the NO DEFAULTS principle from CLAUDE.md:
- **ALL configuration must be explicit** via --config flag
- **No hidden defaults** in the code
- **Fail fast** if configuration is missing
- **Clear error messages** for missing config fields