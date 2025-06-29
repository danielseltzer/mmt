import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Example MMT script showing explicit file selection.
 * 
 * This demonstrates:
 * - Explicit file list selection (WORKS - only selection method currently implemented)
 * - Update frontmatter operations (NOT YET IMPLEMENTED - requires document-operations)
 * - CSV output format
 * 
 * NOTE: File selection works but operations will throw errors until
 * the document-operations package is built.
 */
export default class CherryPickFiles implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      // Explicitly select specific files
      select: { 
        files: [
          'posts/2024/january/important-update.md',
          'posts/2024/january/announcement.md',
          'posts/2024/february/release-notes.md',
        ]
      },
      
      // Update frontmatter to mark as featured
      operations: [
        { 
          type: 'updateFrontmatter',
          updates: {
            featured: true,
            featuredDate: new Date().toISOString()
          }
        }
      ],
      
      // Output as CSV for record keeping
      output: { 
        format: 'csv',
        fields: ['path', 'operation', 'status']
      }
    };
  }
}