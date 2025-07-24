# Issue #22: Implement Analysis Operations

**Labels**: `enhancement`, `operations`, `p2`, `future`  
**Milestone**: 7 (Post-MVP Enhancement) or 6 (QM Enhancement)  
**Blocked by**: #126 (API Refactoring)

## Description

Implement the three analysis operations defined in the `OperationPipelineSchema` that allow for non-destructive data analysis and transformation:

1. **`analyze`** - Perform statistical or content analysis on selected documents
2. **`transform`** - Transform document data without modifying source files  
3. **`aggregate`** - Combine or summarize data across multiple documents

These operations are defined in the schema but not yet implemented. They will enable powerful data analysis workflows without risk of modifying the vault.

## Motivation

- Enable safe exploration and analysis of document collections
- Support reporting and data extraction workflows
- Allow users to preview transformations before applying destructive operations
- Provide foundation for advanced features like bulk content analysis

## Technical Details

### Current State
- Operations are defined in `OperationTypeSchema` in `/packages/entities/src/scripting.schema.ts`
- `PipelineExecutor` throws "not yet implemented" error for these operations
- No corresponding operation implementations in `@mmt/document-operations`

### Implementation Requirements

1. **Operation Implementations**
   - Create new operation classes in `@mmt/document-operations` for each type
   - Define clear interfaces for operation parameters and results
   - Ensure operations are truly non-destructive (no file writes)

2. **Analyze Operation**
   - Word count, character count, reading time
   - Frontmatter statistics (field frequency, value distribution)
   - Link analysis (broken links, orphaned documents)
   - Tag frequency and distribution
   - Custom analysis via user-provided functions

3. **Transform Operation**  
   - Format conversion (Markdown to HTML, JSON, etc.)
   - Content extraction (headings, code blocks, etc.)
   - Frontmatter transformation (without saving)
   - Template-based transformations

4. **Aggregate Operation**
   - Combine multiple documents into reports
   - Generate summaries across document sets
   - Create indexes or tables of contents
   - Statistical rollups

### API Changes
- Update `PipelineExecutor.createDocumentOperation()` to handle analysis operations
- Ensure proper result formatting in `PipelineExecutionResult`
- Support streaming results for large datasets

### Testing Requirements
- Unit tests for each operation type
- Integration tests with real documents
- Performance tests with 1000+ documents
- Verify truly non-destructive behavior

## Acceptance Criteria

- [ ] All three analysis operations are implemented
- [ ] Operations work through the pipeline API
- [ ] Results are properly formatted and returned
- [ ] No files are modified during analysis operations
- [ ] Performance meets targets (< 5 seconds for 5000 files)
- [ ] Comprehensive test coverage
- [ ] Documentation and examples provided

## Future Considerations

- Plugin system for custom analysis operations
- AI-powered analysis (if AI features enabled)
- Export analysis results to various formats
- Caching of analysis results for performance
- Real-time analysis during document editing

## Related Issues

- #126 - API Refactoring (prerequisite)
- #127 - GUI panels will need to support analysis operations
- #128 - Execution feedback for long-running analysis

## Notes

This is a post-MVP enhancement. The core application functionality does not depend on these operations, but they will significantly enhance the tool's analytical capabilities.