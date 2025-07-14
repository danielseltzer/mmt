# MMT Issue Prioritization & Groupings

## 🎯 High Priority Groups (Do Next)

### 1. **UI Selection & Operations** (Continue momentum from filter work)
These directly build on the filter system you just completed:

- **#110**: Web App: Add filter builder UI for document selection (P0, Milestone 4)
  - Natural next step after filters - add UI for building complex queries
- **#90**: Fix shift-click range selection in table-view (Bug, MVP)
  - Essential for multi-select operations
- **#14**: Build View Persistence Package (P1, Milestone 4)
  - Save filter configurations and views

**Why**: You're in a high-velocity UI iteration. These features complete the "selection" story.

### 2. **Query Parser Enhancement**
- **#109**: Support text search, date filters, and compound queries (P0, Milestone 4)
  - Your FilterCriteriaSchema is ready for this
  - Enables complex queries like: `modified:>-30d AND tags:important`

**Why**: Unlocks the full power of your filter system for both UI and CLI.

### 3. **CLI Interactive Mode**
- **#108**: Implement interactive document selection and filtering (P0, MVP)
  - Reuse FilterCriteriaSchema from web
  - Give CLI users the same power

**Why**: Maintains feature parity between web and CLI interfaces.

## 🔧 Technical Debt (Interleave with features)

### Testing & Quality
- **#113**: Fix test failures in scripting and table-view
- **#86**: Fix flaky file watcher test
- **#89**: Fix date sorting test
- **#91**: Fix column resize persistence test
- **#88**: Fix remaining ESLint errors

**Why**: Keep the codebase healthy while adding features.

### Scripting Cleanup
- **#106**: Review and restrict scope of scripting (P0 Bug)
  - Important architectural decision
- **#31**: Advanced Scripting Features (P1)
  - Could leverage your FilterCriteriaSchema

**Why**: Scripting is core to power users; needs clear boundaries.

## 📋 Medium Priority (After core selection/operations)

### Reports & Output
- **#18**: Create Reports Package (P1, Milestone 4)
  - Generate markdown/CSV reports from filtered selections
- **#55**: Test coverage for multiple output destinations

### Documentation
- **#72**: Create scripting documentation with examples (P2)
- **#105**: Implement automated doc generation (P2)
- **#47**: Priority tracking: Script-first development
- **#66**: ADR for package documentation standards
- **#24**: Document package structure standards

## 🔮 Future Enhancements (Post-MVP)

### Similarity Search (Milestone 6)
- **#21**: Create QM Provider Package (P2)
- **#22**: Add Similarity Features (P2)
- **#53**: Claude prompt generation for summaries

### Nice-to-Haves
- **#12**: Document Previews Package (P2)
- **#39**: ADR for GUI Pipeline Generation

## 📊 Recommended Execution Order

1. **Complete selection story** (#110 → #90 → #14)
   - 2-3 days, maintains UI momentum
   
2. **Query parser** (#109)
   - 1-2 days, enables complex queries
   
3. **Fix critical tests** (#113, #86)
   - 1 day, ensures stability
   
4. **CLI interactive mode** (#108)
   - 2-3 days, feature parity
   
5. **Scripting scope** (#106)
   - 1 day, architectural clarity

## 💡 Strategic Notes

1. **You're in a UI flow state** - ride this momentum through the selection/operation story
2. **FilterCriteriaSchema is a key asset** - leverage it across UI, CLI, and scripting
3. **Test fixes can be interleaved** - do them when you need a break from features
4. **Documentation can wait** - but scripting docs (#72) would help users adopt your filter system
5. **Similarity search is clearly post-MVP** - don't get distracted by it yet

The MVP milestone (due 2025-07-11) focuses on "view documents with dates, search/filter, select multiple, and perform bulk operations" - you're perfectly positioned to complete this!