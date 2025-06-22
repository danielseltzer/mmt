import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Tag Analysis
 * ============
 * 
 * Analyzes the usage of tags across your vault, helping you understand
 * your tagging patterns and find opportunities for organization.
 * 
 * TAGS DETECTED:
 * - Frontmatter tags: `tags: [tag1, tag2]`
 * - Inline tags: `#tag` in document content
 * 
 * INSIGHTS PROVIDED:
 * - Most used tags and their document counts
 * - Documents with the most tags
 * - Untagged documents that might need categorization
 * - Tag co-occurrence (which tags appear together)
 * 
 * USE CASES:
 * - Standardize tag naming (find similar tags like #project vs #projects)
 * - Identify over-tagged or under-tagged documents
 * - Discover tag relationships and clusters
 * - Plan tag hierarchy or ontology improvements
 * 
 * @example
 * ```bash
 * pnpm mmt --config your-vault.yaml script examples/analysis/tag-analysis.mmt.ts
 * ```
 */
export default class TagAnalysis implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Analyze all documents
      
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // Get documents with tags
            const tagged = table.filter((d: any) => d.tags_count > 0);
            const untagged = table.filter((d: any) => d.tags_count === 0);
            
            console.log(`\n📊 TAG ANALYSIS\n${'='.repeat(50)}\n`);
            console.log(`Total documents: ${table.numRows()}`);
            console.log(`Tagged documents: ${tagged.numRows()} (${(tagged.numRows()/table.numRows()*100).toFixed(1)}%)`);
            console.log(`Untagged documents: ${untagged.numRows()} (${(untagged.numRows()/table.numRows()*100).toFixed(1)}%)`);
            
            // Analyze tag distribution
            const tagStats = tagged.rollup({
              total_tags: aq.op.sum('tags_count'),
              max_tags: aq.op.max('tags_count'),
              avg_tags: aq.op.mean('tags_count')
            }).objects()[0];
            
            console.log(`\nTag Statistics:`);
            console.log(`  Total tags used: ${tagStats.total_tags}`);
            console.log(`  Average tags per tagged document: ${tagStats.avg_tags.toFixed(2)}`);
            console.log(`  Maximum tags on a single document: ${tagStats.max_tags}`);
            
            // Find most tagged documents
            console.log(`\n🏷️  Most Tagged Documents:`);
            const mostTagged = tagged
              .orderby(aq.desc('tags_count'))
              .slice(0, 5)
              .select('name', 'tags_count', 'tags');
            
            mostTagged.objects().forEach((doc: any, i: number) => {
              console.log(`  ${i + 1}. ${doc.name}: ${doc.tags_count} tags`);
              console.log(`     Tags: ${doc.tags}`);
            });
            
            // Parse individual tags and count occurrences
            const tagCounts = new Map<string, number>();
            tagged.objects().forEach((doc: any) => {
              if (doc.tags) {
                const tags = doc.tags.split(', ');
                tags.forEach((tag: string) => {
                  tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
              }
            });
            
            // Convert to array and sort by count
            const sortedTags = Array.from(tagCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20);
            
            console.log(`\n🔝 Top 20 Most Used Tags:`);
            sortedTags.forEach(([tag, count], i) => {
              console.log(`  ${(i + 1).toString().padStart(2)}. #${tag}: ${count} documents`);
            });
            
            console.log('\n' + '='.repeat(50) + '\n');
            console.log('Documents with most tags:\n');
            
            // Return table of most tagged documents
            return tagged
              .orderby(aq.desc('tags_count'))
              .select('name', 'tags_count', 'tags', 'links_count')
              .slice(0, 20);
          }
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