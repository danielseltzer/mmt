import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Example MMT script that deletes old draft posts.
 * 
 * This demonstrates:
 * - Query-based selection using frontmatter (NOT YET IMPLEMENTED - requires indexer)
 * - Delete operations (NOT YET IMPLEMENTED)
 * - Detailed output format
 * - Safe-by-default with explicit execute required
 * 
 * NOTE: This script will throw errors until the required packages are built.
 * It serves as a specification for future functionality.
 */
export default class CleanupDrafts implements Script {
  define(context: ScriptContext): OperationPipeline {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return {
      // Select files with status: draft in frontmatter
      select: { 'fm:status': 'draft' },
      
      // Filter to only drafts older than 30 days
      filter: doc => doc.metadata.modified < thirtyDaysAgo,
      
      // Delete matching files
      operations: [
        { type: 'delete' }
      ],
      
      // Show detailed output including each file
      output: { 
        format: 'detailed' 
      }
      
      // No executeNow - requires explicit --execute flag
    };
  }
}