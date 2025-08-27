import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Example MMT script that archives posts older than one week.
 * 
 * This demonstrates:
 * - Pattern-based file selection (NOT YET IMPLEMENTED - requires indexer)
 * - Filter functions to refine selection
 * - Move operations (NOT YET IMPLEMENTED - requires file-relocator)
 * - Safe-by-default (preview mode)
 * 
 * NOTE: This script will throw errors until the required packages are built.
 * It serves as a specification for future functionality.
 */
export default class ArchiveOldPosts implements Script {
  define(context: ScriptContext): OperationPipeline {
    // Calculate date one week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return {
      // Select all markdown files in the posts directory
      select: { 'fs:path': 'posts/**/*.md' },
      
      // Filter to only files modified more than a week ago
      filter: {
        conditions: [{
          field: 'modified',
          operator: 'lt',
          value: oneWeekAgo.toISOString()
        }],
        logic: 'AND'
      },
      
      // Move matching files to archive
      operations: [
        { type: 'move', destination: 'archive/old-posts' }
      ],
      
      // Output summary by default
      output: { format: 'summary' }
      
      // Note: no executeNow option, so this runs in preview mode
    };
  }
}