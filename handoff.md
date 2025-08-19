Date: 2025-01-19Status: BLOCKED - Qdrant "Bad Request" ErrorPriority: HIGH - Core
functionality non-working

Executive Summary

MMT's similarity search implementation has gone through multiple iterations:
- Orama Provider: Implemented but abandoned due to significant issues (details
  lost)
- Qdrant Provider: Implemented with Docker integration, but experiencing "Bad
  Request" errors during document indexing
- Current Blocker: Documents cannot be indexed into Qdrant - fails with "Bad
  Request" on upsert operations
- Root Cause: Likely metadata payload issues, specifically the use of
  ...doc.metadata spreading potentially large fields

Implementation History

Orama Provider (Abandoned)

- Package: packages/similarity-provider-orama/
- Status: Implemented but lost confidence due to significant issues
- Current: Wrapper exists but not actively used

Qdrant Provider (Current - Broken)

- Package: packages/similarity-provider-qdrant/
- Docker Integration: Added Qdrant management to MMT CLI
- Status: Implemented but experiencing "Bad Request" errors
- Issue: Cannot index documents at any scale (even single documents fail)

Recent Changes Made

File: packages/similarity-provider-qdrant/src/qdrant-provider.ts

Changes implemented (broader than requested):
1. MD5-to-UUID Conversion (lines 136-146): Added conversion method (NOT needed per
   research)
2. Content Removal (lines 195, 243): Removed content from payload to reduce size
3. Original ID Tracking: Added originalId field to maintain reference to MD5 hash
4. Enhanced Logging: Added more console.log statements for debugging
5. Made embedding method public: Changed generateEmbedding visibility

CRITICAL ISSUE: The core problem was NOT fixed:
- Lines 195 and 243 still use ...doc.metadata
- This spreads ALL metadata fields, potentially including large content or
  unexpected data
- This is the most likely cause of "Bad Request" errors

Current Architecture

Provider Interface

- Base class: BaseSimilarityProvider in packages/similarity-provider/
- Pluggable system supporting multiple vector databases
- Zod schemas for data validation
- Clean separation between providers

Integration Points

- API Routes: apps/api-server/src/routes/similarity.ts
- Service Layer: apps/api-server/src/services/similarity-search-provider.ts
- Configuration: Schema in packages/entities/src/config.schema.ts

Qdrant Setup

- Uses @qdrant/js-client-rest client
- Collection: 768-dimensional vectors (nomic-embed-text model)
- Embedding: Generated via Ollama integration
- Docker: Managed through MMT CLI commands

Root Cause Analysis

Research Conducted

1. Qdrant ID Format: Verified UUIDs are acceptable (both numeric and string
   formats)
   - Hyphenated UUID format is documented as supported
   - MD5-to-UUID conversion is NOT the issue
2. Payload Investigation: Identified metadata spreading as likely culprit
   - ...doc.metadata could include unexpected large fields
   - Qdrant may have payload size or field restrictions
3. Error Handling: Current error logging doesn't capture Qdrant's specific error
   response

Known NOT the Problem

- UUID format (confirmed acceptable per Qdrant docs)
- Embedding dimensions (768 is correct)
- Collection configuration
- Qdrant Docker setup

Most Likely Problem

Metadata Spreading at lines 195 and 243:
payload: {
originalId: doc.id,
path: doc.path,
...doc.metadata  // <-- PROBLEM: Could include large/unexpected fields
}

Current Code Issues

CRITICAL - Unfixed Issues

1. Metadata Spreading (lines 195, 243): Still uses ...doc.metadata - the likely
   root cause
2. Missing Detailed Error Logging: Don't capture Qdrant's actual error response
3. No Payload Validation: No size or structure validation before sending to Qdrant

Recent Modifications Made

- ✅ Content removed from payload (good for size reduction)
- ✅ UUID conversion added (unnecessary but harmless)
- ✅ Basic logging improved
- ❌ Critical metadata spreading issue NOT fixed
- ❌ Detailed error capture NOT implemented

Current File States (Git Status)

Modified Files:

- apps/api-server/package.json
- apps/api-server/src/context.ts
- apps/api-server/src/routes/similarity.ts
- packages/entities/src/config.schema.ts
- packages/similarity-provider-orama/package.json
- packages/similarity-provider-orama/src/orama-provider.ts
- packages/similarity-provider-qdrant/package.json
- packages/similarity-provider-qdrant/src/qdrant-provider.ts (main file with
  issues)
- packages/similarity-provider/package.json
- packages/similarity-provider/src/index.ts
- pnpm-lock.yaml

New Files Created:

- apps/api-server/src/services/similarity-search-provider.ts
- config/personal-vault-qdrant.yaml
- test-qdrant-debug.js
- test-qdrant-direct.js
- qdrant_storage/collections/ (Docker volume)

Test Environment

Qdrant Docker

- Service running on localhost:6333
- Collections API accessible
- Storage volume: qdrant_storage/collections/

Configuration

- File: config/personal-vault-qdrant.yaml
- Includes Qdrant and Ollama endpoints
- Similarity search enabled in vault config

Test Scripts (Created but not executed)

- test-qdrant-debug.js: Direct Qdrant API testing
- test-qdrant-direct.js: Provider testing script

Immediate Next Steps Required

1. Fix Critical Metadata Spreading (URGENT)

File: packages/similarity-provider-qdrant/src/qdrant-provider.tsLines: 195, 243

Replace:
...doc.metadata  // Spreads ALL fields - problematic

With:
// Only include specific, small metadata fields
title: doc.metadata?.title,
tags: doc.metadata?.tags,
created: doc.metadata?.created,
modified: doc.metadata?.modified
// DO NOT spread all metadata - could include large content fields

2. Improve Error Logging (HIGH)

File: packages/similarity-provider-qdrant/src/qdrant-provider.tsLines: 268-285

Add detailed error capture to see Qdrant's actual error response:
} catch (error: any) {
console.error(`[QDRANT] CRITICAL: Batch upsert failed:`, {
error: error.message,
httpStatus: error.response?.status,
qdrantError: error.response?.data,
samplePayload: JSON.stringify(points[0], null, 2).slice(0, 500)
});

3. Test Single Document (IMMEDIATE)

- Fix metadata spreading first
- Test with one document only
- Capture exact error messages
- Verify payload structure

4. Gradual Scale Testing

- Start with 1 document (verify works)
- Scale to 10, then 50, then 100
- Monitor for payload size issues
- Identify bottlenecks before scaling to 6k

Technical Configuration

Current Provider Configuration

# config/personal-vault-qdrant.yaml
similarity:
provider: "qdrant"
qdrant:
url: "http://localhost:6333"
ollama:
url: "http://localhost:11434"
model: "nomic-embed-text"

Qdrant Collection Setup

- Dimensions: 768 (nomic-embed-text)
- Distance: Cosine similarity
- Collection name: Based on vault configuration

Success Criteria

Phase 1: Fix and Test

- Metadata spreading fixed (explicit field selection)
- Enhanced error logging implemented
- Single document indexing succeeds
- Detailed error messages captured (if issues persist)

Phase 2: Scale Testing

- 10 documents index successfully
- 100 documents index successfully
- 1000 documents index successfully
- Performance metrics documented

Phase 3: Production Ready

- Full 6k document vault indexes successfully
- Search queries return relevant results
- Performance meets requirements (<5 seconds for indexing)

Key Learnings for Next Developer

1. Don't change UUID format - Research confirmed it's acceptable
2. Focus on metadata payload - This is the most likely root cause
3. Start small - Test single document before scaling
4. Capture detailed errors - Need Qdrant's specific error responses
5. The architecture is sound - Just implementation details need fixing

The similarity search functionality is close to working. The main blocker is likely
the metadata spreading issue that sends unexpected large fields to Qdrant. Fix
this first, then test systematically at increasing scales.