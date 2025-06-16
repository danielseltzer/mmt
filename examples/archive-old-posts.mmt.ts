import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Example MMT script that archives posts older than one week.
 * 
 * This demonstrates:
 * - Pattern-based file selection
 * - Filter functions to refine selection
 * - Move operations
 * - Safe-by-default (preview mode)
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
      filter: doc => doc.metadata.modified < oneWeekAgo,
      
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