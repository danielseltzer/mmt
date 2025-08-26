# TableView Testing Strategy - Handling Rapidly Evolving UI

## The Challenge

The TableView component is:
- The central UI element that will continue evolving
- Integrating new features (similarity search, bulk operations, etc.)
- Changing frequently in presentation layer
- Complex with TanStack Table integration
- Difficult to test without real data

Traditional UI tests would be:
- Brittle (break with every UI change)
- Expensive to maintain
- Slow to run
- Poor ROI during rapid iteration

## Proposed Testing Strategies

### Strategy 1: Headless Logic Testing (RECOMMENDED)
**Separate business logic from presentation entirely**

#### Implementation
1. **Extract Core Logic into Hooks**
   ```typescript
   // useTableSelection.ts - Test this independently
   export function useTableSelection(documents: Document[]) {
     const [selection, setSelection] = useState<Set<string>>(new Set());
     
     const selectRange = (start: number, end: number) => {
       // Logic for shift-click selection
     };
     
     const toggleSelection = (path: string) => {
       // Logic for single selection
     };
     
     return { selection, selectRange, toggleSelection };
   }
   
   // useTableFiltering.ts - Test this independently
   export function useTableFiltering(documents: Document[]) {
     // Filtering logic extracted from presentation
   }
   
   // useTableSorting.ts - Test this independently
   export function useTableSorting(documents: Document[]) {
     // Sorting logic extracted from presentation
   }
   ```

2. **Create a Headless Table Core**
   ```typescript
   // TableCore.ts - No React, no UI, pure logic
   export class TableCore {
     private documents: Document[];
     private selection: Set<string>;
     private sortConfig: SortConfig;
     
     selectDocument(path: string) { /* pure logic */ }
     selectRange(start: number, end: number) { /* pure logic */ }
     getSortedDocuments(): Document[] { /* pure logic */ }
     getFilteredDocuments(filters: Filter[]): Document[] { /* pure logic */ }
     exportSelection(format: string): string { /* pure logic */ }
   }
   ```

3. **Test the Core Exhaustively**
   ```typescript
   describe('TableCore', () => {
     it('handles shift-click selection correctly', () => {
       const core = new TableCore(testDocuments);
       core.selectRange(0, 5);
       expect(core.getSelectedPaths()).toEqual([/* first 6 paths */]);
     });
     
     it('maintains selection when sorting', () => {
       const core = new TableCore(testDocuments);
       core.selectDocument('path1');
       core.sortBy('name', 'desc');
       expect(core.getSelectedPaths()).toContain('path1');
     });
   });
   ```

#### Benefits
- ✅ Tests run in milliseconds (no DOM)
- ✅ 100% stable (logic doesn't change when UI does)
- ✅ Easy to test edge cases
- ✅ Can test with generated data
- ✅ Refactoring UI doesn't break tests

#### Drawbacks
- Requires refactoring to separate logic from presentation
- Some integration bugs might slip through

### Strategy 2: Contract Testing with API Layer
**Test the data layer, not the presentation**

#### Implementation
1. **Define Data Contracts**
   ```typescript
   interface TableDataProvider {
     getDocuments(): Promise<Document[]>;
     getSelectedDocuments(): Document[];
     sortDocuments(field: string, order: 'asc' | 'desc'): void;
     filterDocuments(filters: Filter[]): void;
     selectDocument(path: string): void;
     selectRange(start: number, end: number): void;
   }
   ```

2. **Test the Contract Implementation**
   ```typescript
   describe('TableDataProvider', () => {
     it('provides documents in correct format', async () => {
       const provider = new TableDataProvider();
       const docs = await provider.getDocuments();
       
       // Test structure, not presentation
       expect(docs).toEqual(
         expect.arrayContaining([
           expect.objectContaining({
             path: expect.any(String),
             metadata: expect.objectContaining({
               name: expect.any(String),
               modified: expect.any(Date),
             })
           })
         ])
       );
     });
   });
   ```

3. **Mock the Provider in UI Tests**
   ```typescript
   // Simple smoke test for UI
   it('renders without crashing', () => {
     const mockProvider = new MockTableDataProvider(testData);
     render(<TableView provider={mockProvider} />);
     // Just verify it renders, don't test specifics
   });
   ```

#### Benefits
- ✅ Tests data availability and format
- ✅ UI can change freely
- ✅ Fast test execution
- ✅ Clear separation of concerns

#### Drawbacks
- Doesn't test actual user interactions
- Requires architectural changes

### Strategy 3: Visual Regression with Tolerance
**Use visual testing but accept changes**

#### Implementation
1. **Use Percy/Chromatic/Playwright Visual Testing**
   ```typescript
   test('table displays documents', async ({ page }) => {
     await page.goto('/table');
     await expect(page).toHaveScreenshot('table-with-documents.png', {
       // Allow some visual difference
       maxDiffPixelRatio: 0.1,
       // Mask dynamic content
       mask: [page.locator('.timestamp')],
     });
   });
   ```

2. **Test Interactions, Not Pixels**
   ```typescript
   test('selection works', async ({ page }) => {
     await page.goto('/table');
     
     // Test behavior, not appearance
     await page.click('[data-row="0"]');
     await page.keyboard.down('Shift');
     await page.click('[data-row="5"]');
     
     // Assert on data, not UI
     const selected = await page.evaluate(() => 
       window.getSelectedDocuments().length
     );
     expect(selected).toBe(6);
   });
   ```

#### Benefits
- ✅ Catches major breaking changes
- ✅ Tests actual user experience
- ✅ Can be configured to tolerate minor changes

#### Drawbacks
- Slower than unit tests
- Requires maintenance when intentional changes occur
- Needs real browser environment

### Strategy 4: Behavioral Testing with Data Attributes
**Test behavior through stable data attributes**

#### Implementation
1. **Add Stable Test Hooks**
   ```tsx
   <table data-testid="document-table">
     <tr data-row-path={doc.path} data-row-index={index}>
       <td data-cell="name">{doc.name}</td>
       <td data-cell="modified">{doc.modified}</td>
     </tr>
   </table>
   ```

2. **Test Behaviors, Not Layout**
   ```typescript
   describe('Table Behaviors', () => {
     it('sorts by column click', () => {
       const { getByTestId, getAllByRole } = render(<TableView />);
       
       fireEvent.click(getByTestId('sort-name'));
       
       const rows = getAllByRole('row');
       const names = rows.map(r => r.dataset.rowPath);
       expect(names).toEqual(names.sort());
     });
   });
   ```

#### Benefits
- ✅ Tests user-facing behavior
- ✅ Resilient to style changes
- ✅ Good middle ground

#### Drawbacks
- Still coupled to DOM structure
- Requires maintaining test attributes

## Recommended Approach

### Phase 1: Immediate (Before Refactoring)
1. **Extract and test core selection logic** (2 hours)
   - `useTableSelection` hook
   - `useTableSorting` hook
   - Test these thoroughly with unit tests

2. **Add behavioral smoke tests** (1 hour)
   - Basic rendering
   - Selection works
   - Sorting works
   - Use data attributes, not visual assertions

### Phase 2: During Refactoring
1. **Create TableCore class** (included in refactoring time)
   - Move all business logic here
   - No React dependencies
   - 100% testable

2. **Keep TableView as thin presenter**
   - Only rendering logic
   - Delegates to TableCore
   - Minimal testing needed

### Phase 3: Long-term
1. **Contract-based testing**
   - Define interfaces for data providers
   - Test against contracts
   - UI becomes pluggable

## Example Refactored Architecture

```
TableView.tsx (Presentation - Minimal Tests)
    ↓ uses
TableCore.ts (Business Logic - Heavy Tests)
    ↓ uses
TableHooks/ (Reusable Logic - Unit Tests)
  - useSelection.ts
  - useSorting.ts
  - useFiltering.ts
  - useContextMenu.ts
    ↓ uses
DocumentStore (Data Layer - Integration Tests)
```

## Testing Priority

1. **HIGH: Core Logic** (selection, sorting, filtering algorithms)
2. **HIGH: Data Transformations** (format conversions, exports)
3. **MEDIUM: Integration Points** (API calls, store updates)
4. **LOW: Visual Presentation** (colors, spacing, animations)

## Success Metrics

- **Coverage Target**: 80% for logic, 20% for presentation
- **Test Stability**: Logic tests never break from UI changes
- **Test Speed**: Core logic tests run in < 1 second
- **Maintenance Cost**: < 10% of development time

## Conclusion

The key insight is to **test the brain, not the face**. The TableView's business logic (selection, sorting, filtering, data transformation) is stable and should be tested thoroughly. The presentation layer will keep changing and should have minimal, resilient tests focused on critical user journeys.

By extracting logic into testable units, we can achieve high confidence without brittle tests. This approach is used successfully by companies like Spotify (Headless UI pattern), Airbnb (Contract Testing), and Facebook (Behavioral Testing).

The 13 skipped tests should be:
1. **Reviewed** to identify which test logic vs presentation
2. **Refactored** to test extracted hooks/core
3. **Deleted** if they test pure presentation
4. **Kept** only if they test critical user journeys