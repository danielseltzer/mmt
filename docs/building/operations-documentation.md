# Operations Documentation Strategy

## Decision: JSDoc-based Documentation

We document MMT's query language and operations using JSDoc comments directly in the TypeScript interfaces and schemas. This keeps documentation close to the implementation and leverages TypeScript's type system.

## Why This Approach

1. **Co-location** - Documentation lives with the code it describes
2. **Type Safety** - TypeScript validates that documented properties exist
3. **IDE Support** - JSDoc comments appear in autocomplete and hover tooltips
4. **Extraction** - Can generate reference docs from JSDoc using TypeScript compiler API
5. **Validation** - Tests can verify documented behavior matches implementation

## Example

```typescript
/**
 * @namespace fs
 * @description Query filesystem properties of documents
 */
export interface FilesystemQuery {
  /** 
   * @matcher minimatch
   * @example "posts/**/*.md"
   * @description Match file paths using glob patterns
   */
  path?: QueryOperator<string>;
  
  /** 
   * @matcher exact
   * @example "README"
   * @description Match filename without extension
   */
  name?: QueryOperator<string>;
}
```

## Maintenance

- Update JSDoc when changing query behavior
- Include `@matcher` tag to document matching algorithm
- Add `@example` tags with real query examples
- Use `@description` for user-facing explanations

## Generating Documentation

Future script will extract JSDoc tags to generate:
- Query syntax reference
- Operation behavior guide
- Example query cookbook