# ADR-010: Claude Prompt Generation for Report Summaries

## Status
Accepted (2025-06-22)

## Context
MMT generates detailed markdown reports from script executions that contain tables, statistics, and metadata. While these reports are comprehensive, users would benefit from natural language summaries that extract key insights. We want to generate prompts that can be used with Claude to create these summaries.

### Discovery Process
We tested Claude's ability to summarize reports by:
1. Having Claude (as Claude Code) analyze an actual report (`most-linked-documents.md`)
2. Claude identified three knowledge hubs (music practice, recurring activities, family/personal)
3. Claude noted the low connection density (max 4 backlinks among 5,920 documents)
4. This demonstrated the value of AI-powered insight extraction

### Example Summary Generated
"Your most-referenced documents reveal three distinct knowledge hubs in your vault: music practice (jazz standards like "Fly me to the Moon" and "Autumn Leaves" repeatedly linked from Neil Shepard session notes), recurring life activities (wing foiling trip prep and Cape Cod vacation planning that you refine year over year), and family/personal care (Hillary's gifts and your granola recipe). The low backlink counts (max of 4) across 5,920 documents suggest you primarily create forward references rather than building densely interconnected knowledge networks."

## Decision Drivers
1. **User Experience**: Make insights accessible without manual analysis
2. **Flexibility**: Support different report types (link analysis, tag analysis, orphans, etc.)
3. **Simplicity**: Avoid complex prompt engineering if possible
4. **Quality**: Generate meaningful, actionable insights
5. **Integration**: Seamless addition to existing report generation

## Considered Options

### Option 1: Universal Prompt Template
Use a single prompt template that works across all report types.

**Proposed Universal Prompt:**
```
Analyze this vault analysis report and summarize in 2-3 sentences what the data reveals about knowledge organization patterns:

[REPORT CONTENT]
```

**Pros:**
- Simple implementation
- Consistent user experience
- Easier to maintain
- Claude can adapt based on report content

**Cons:**
- May miss report-specific insights
- Less optimized for each analysis type

### Option 2: Report-Specific Prompts
Create tailored prompts for each report type.

**Examples:**
- Link Analysis: "What do the connection patterns reveal about knowledge hubs?"
- Tag Analysis: "What does the tag distribution suggest about categorization habits?"
- Orphan Analysis: "What patterns exist in disconnected documents?"

**Pros:**
- Optimized insights per report type
- Can ask specific relevant questions
- More guided analysis

**Cons:**
- More complex to implement and maintain
- Requires prompt per report type
- Less flexible for new report types

### Option 3: Hybrid Approach
Use a universal base with report-specific hints.

**Template:**
```
Analyze this [REPORT_TYPE] report and summarize in 2-3 sentences what the data reveals about [FOCUS_AREA]:

[REPORT CONTENT]
```

**Pros:**
- Balance of flexibility and specificity
- Reusable structure
- Adaptable to new reports

**Cons:**
- Still requires some per-report configuration

## Decision
**Universal Detailed Prompt (Option 1 Enhanced)** - After testing 5 prompt variations with actual report data, the universal detailed approach provides the best balance of insight quality and flexibility.

### Testing Process
Generated and tested 5 prompt variations:
1. **Universal Minimal** - Simple, open-ended prompt
2. **Universal Detailed** - Added focus areas and context
3. **Report-Specific** - Included vault size and document count
4. **Action-Oriented** - Emphasized recommendations
5. **Pattern-Focused** - Targeted pattern recognition

### Results
Each prompt was tested against a real report (most-linked documents from 5,920 document vault):
- All variations successfully identified core themes
- Universal Detailed (#2) provided ideal balance of guidance and flexibility
- Action-oriented changed output structure (included recommendations)
- Pattern-focused yielded best metaphors ("personal operating system")
- Report-specific included precise calculations but was too rigid

### Selected Prompt Template
```
I have a markdown report from analyzing [ANALYSIS_TYPE] in my personal knowledge vault. Please provide a concise summary (2-3 sentences) identifying the critical insights about my knowledge organization patterns and note-taking habits.

Focus on:
1. What the [KEY_METRIC] reveal about recurring themes or knowledge hubs
2. What the [PATTERNS] suggest about how I organize and connect information
3. Any notable patterns in the ratio of documents to connections

Here's the report:

[REPORT CONTENT]
```

### Rationale (User's Subjective Assessment)
- Provides enough context without being overly prescriptive
- The three focus areas guide analysis while allowing flexibility
- Works across different report types with minor variable substitution
- Maintains consistent quality of insights
- Starting point for iterative refinement based on usage

## Implementation Plan

### Phase 1: Testbed Development
1. Create a test harness that can:
   - Load sample reports
   - Apply different prompt templates
   - Generate outputs using Claude API
   - Present results for comparison

2. Test variations:
   - Conciseness constraints (2-3 sentences vs paragraph)
   - Context provided (minimal vs detailed)
   - Focus areas (patterns vs actionable insights)

### Phase 2: Evaluation Criteria
Subjectively evaluate prompts based on:
- **Insight Quality**: Are the observations meaningful?
- **Actionability**: Do they suggest next steps?
- **Accuracy**: Do they correctly interpret the data?
- **Conciseness**: Are they appropriately brief?
- **Relevance**: Do they focus on what matters?

### Phase 3: Integration
1. Add `--claude-prompt` flag to report generation
2. Append prompt section to reports
3. Option to save prompt separately
4. Consider API integration for direct summary generation

## Test Cases
1. **Link Analysis Report**: Test hub identification, connection density insights
2. **Tag Analysis Report**: Test categorization pattern recognition
3. **Orphan Documents Report**: Test isolation pattern insights
4. **Document Type Analysis**: Test content organization insights

## Consequences

### Positive
- Reports become more accessible to users
- Insights extracted automatically
- Natural language summaries complement data tables
- Enables pattern recognition across vault

### Negative
- Requires Claude/LLM access for summaries
- Prompt engineering complexity
- Subjective quality evaluation
- Potential for misinterpretation

## Future Considerations
1. **API Integration**: Direct summary generation without copy-paste
2. **Prompt Library**: Collection of tested, refined prompts
3. **User Customization**: Allow users to modify prompts
4. **Multi-Report Analysis**: Summarize across multiple reports
5. **Trend Analysis**: Compare reports over time

## Notes
- Initial testing shows Claude can extract meaningful patterns with minimal prompting
- The quality of insights depends on both prompt design and report content
- Universal prompts may be sufficient given Claude's capability to adapt