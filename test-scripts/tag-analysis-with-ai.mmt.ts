import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Tag Analysis with AI-Powered Insights
 * =====================================
 * 
 * Analyzes frontmatter tags across your vault and uses Claude to identify
 * patterns in your tagging system and organizational structure.
 * 
 * ANALYZES:
 * - Tag frequency and distribution
 * - Documents with most tags
 * - Tag co-occurrence patterns
 * - Untagged document percentage
 * 
 * AI INSIGHTS:
 * - Tagging philosophy and patterns
 * - Tag hierarchies and relationships
 * - Recommendations for tag consolidation
 * - Organizational insights from tag usage
 * 
 * @example
 * ```bash
 * # Generate report with AI analysis
 * pnpm mmt --config your-vault.yaml script test-scripts/tag-analysis-with-ai.mmt.ts --report
 * ```
 */
export default class TagAnalysisWithAI implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Analyze all documents
      
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // First, create a comprehensive tag frequency table
            const taggedDocs = table.filter((d: any) => d.tags_count > 0);
            
            // Build tag frequency data
            const tagData: Array<{tag: string, count: number, documents: string[]}> = [];
            const tagMap = new Map<string, Set<string>>();
            
            taggedDocs.objects().forEach((doc: any) => {
              if (doc.tags) {
                const tags = doc.tags.split(', ');
                tags.forEach((tag: string) => {
                  if (!tagMap.has(tag)) {
                    tagMap.set(tag, new Set());
                  }
                  tagMap.get(tag)!.add(doc.name);
                });
              }
            });
            
            // Convert to array format
            tagMap.forEach((docs, tag) => {
              tagData.push({
                tag: tag,
                count: docs.size,
                documents: Array.from(docs).slice(0, 3).join(', ') + (docs.size > 3 ? '...' : '')
              });
            });
            
            // Sort by frequency
            tagData.sort((a, b) => b.count - a.count);
            
            // Create table from tag data
            const tagTable = aq.from(tagData.slice(0, 30)); // Top 30 tags
            
            // Add statistics
            const totalDocs = table.numRows();
            const taggedCount = taggedDocs.numRows();
            const untaggedCount = totalDocs - taggedCount;
            
            // Add summary statistics to the table
            return tagTable.derive({
              tag_percentage: aq.escape((d: any) => ((d.count / taggedCount) * 100).toFixed(1) + '%'),
              vault_percentage: aq.escape((d: any) => ((d.count / totalDocs) * 100).toFixed(1) + '%')
            }).derive({
              // Add context for AI analysis
              _total_docs: aq.escape(() => totalDocs),
              _tagged_docs: aq.escape(() => taggedCount),
              _untagged_docs: aq.escape(() => untaggedCount),
              _unique_tags: aq.escape(() => tagMap.size)
            });
          }
        }
      ],
      
      output: [
        {
          format: 'table',
          destination: 'console',
          fields: ['tag', 'count', 'tag_percentage', 'vault_percentage', 'documents']
        },
        {
          format: 'csv',
          destination: 'file',
          path: 'tag-analysis.csv'
        }
      ],
      
      // Enable AI analysis for tag patterns
      agentAnalysis: {
        enabled: true,
        model: 'sonnet'
      }
    };
  }
}