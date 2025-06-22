import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find old draft posts that should be archived.
 * This demonstrates the analysis -> document set -> mutation pipeline.
 * 
 * In a real scenario, this would be followed by:
 * ```typescript
 * const results = await mmt
 *   .mutate(docSet)
 *   .move('archive/2023')
 *   .execute({ destructive: true });
 * ```
 */
export default class ArchiveOldDrafts implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { ops } = context as any;
    
    return {
      select: { 'fm:status': 'draft' }, // Only drafts
      operations: [
        {
          type: 'analyze',
          transform: (table: any) => {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            return table
              .filter((d: any) => new Date(d.modified) < sixMonthsAgo)
              .derive({
                months_old: (d: any) => {
                  const now = new Date();
                  const modified = new Date(d.modified);
                  const months = (now.getFullYear() - modified.getFullYear()) * 12 +
                                (now.getMonth() - modified.getMonth());
                  return months;
                },
                year: (d: any) => new Date(d.modified).getFullYear()
              })
              .orderby(['year', 'modified'])
              .select(['path', 'name', 'modified', 'months_old', 'year']);
          }
        },
        {
          type: 'transform',
          // This would prepare documents for archiving
          transform: (table: any) => {
            // Add archive metadata
            return table.derive({
              archive_reason: 'Old draft (>6 months)',
              archive_date: new Date().toISOString(),
              suggested_location: (d: any) => `archive/${d.year}/drafts`
            });
          }
        }
      ],
      output: [
        {
          format: 'table',
          destination: 'console',
          fields: ['path', 'name', 'months_old', 'suggested_location']
        }
      ]
    };
  }
}