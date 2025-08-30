# Configuration Audit Results

## Issues Found

### 1. Environment Variable Usage

#### API Server (apps/api-server/src/server.js)
- **VIOLATION**: Uses `process.env.PORT || 3001`
- **Fix Required**: Port should come from config file, not env var or default

#### Control Manager (apps/control-manager/src/control-manager.ts)
- Uses `process.env` but only to pass environment to child processes
- Sets `PORT` in environment for spawned processes
- **Partial Issue**: Still propagating PORT env var

### 2. Default Values

#### API Server
- Has default port 3001 if PORT env var not set
- **VIOLATION**: No defaults allowed

#### Control Manager  
- Has default ports in constructor (3001, 5173)
- **VIOLATION**: These should be required from config

### 3. Path Validation

#### Config Service
- ✅ Correctly validates absolute paths at schema level
- ✅ No path conversions or defaults
- ✅ Fails fast with clear errors

#### Control Manager
- ✅ Fixed: No longer converts relative paths to absolute

## Recommendations

1. **Remove PORT environment variable usage**
   - Add `apiPort` and `webPort` to Config schema
   - Read ports from config file only

2. **Remove default ports from control manager**
   - Require ports in config or as explicit CLI args
   - No fallback values

3. **Add config validation tests**
   - Test that env vars are ignored
   - Test that missing config fails immediately
   - Test that relative paths fail

## Files Needing Updates

1. `/apps/api-server/src/server.js` - Remove PORT env var
2. `/apps/control-manager/src/control-manager.ts` - Remove default ports
3. `/packages/entities/src/config.schema.ts` - Add port configuration