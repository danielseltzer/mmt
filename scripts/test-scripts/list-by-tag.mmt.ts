import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Tag-based filtering example - lists documents with specific tags.
 * 
 * Purpose: Demonstrate tag filtering and document selection
 * Use case: Find all documents related to a topic/project via tags
 * Features: Tag array filtering, sorting by date
 * 
 * Comparable to Dataview:
 * ```dataview
 * LIST
 * FROM #project
 * ```
 * 
 * Note: Currently searches for 'journal' tag as test vault doesn't have 'project' tag.
 * Modify the filter to search for tags in your vault.
 */
export default class ListByTag implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            // Filter to documents containing the tag
            .filter((d: any) => d.tags && d.tags.includes('journal'))
            // Select relevant columns
            .select('name', 'path', 'tags', 'modified')
            // Sort by modified date descending
            .orderby(aq.desc('modified'))
        }
      ],
      output: [
        {
          format: 'table',
          destination: 'console'
        }
      ]
    };
  }
}