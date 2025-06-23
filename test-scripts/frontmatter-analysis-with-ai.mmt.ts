import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Frontmatter Properties Analysis with AI
 * =======================================
 * 
 * Analyzes all frontmatter properties across your vault to understand
 * your metadata structure and organizational patterns.
 * 
 * ANALYZES:
 * - Which frontmatter properties are most commonly used
 * - Value distribution for each property
 * - Documents with the most properties
 * - Property co-occurrence patterns
 * 
 * AI INSIGHTS:
 * - Your metadata philosophy and structure
 * - Property relationships and hierarchies
 * - Recommendations for property standardization
 * - Organizational insights from property usage
 * 
 * @example
 * ```bash
 * # Generate report with AI analysis
 * pnpm mmt --config your-vault.yaml script test-scripts/frontmatter-analysis-with-ai.mmt.ts --report
 * ```
 */
export default class FrontmatterAnalysisWithAI implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Analyze all documents
      
      operations: [
        { 
          type: 'custom',
          action: 'analyze',
          handler: (docs: any, { table }: any) => {
            // Collect all frontmatter properties and their usage
            const propertyData: Array<{
              property: string,
              count: number,
              unique_values: number,
              common_values: string,
              coverage_percentage: string
            }> = [];
            
            const totalDocs = docs.length;
            
            // Get all unique frontmatter property names
            const allProperties = new Set<string>();
            const propertyValues = new Map<string, Map<string, number>>();
            
            // Analyze each document's frontmatter
            docs.forEach((doc: any) => {
              if (doc.metadata && doc.metadata.frontmatter) {
                const fm = doc.metadata.frontmatter;
                Object.keys(fm).forEach(key => {
                  allProperties.add(key);
                  
                  const value = fm[key];
                  if (value !== null && value !== undefined && value !== '') {
                    if (!propertyValues.has(key)) {
                      propertyValues.set(key, new Map());
                    }
                    const valueMap = propertyValues.get(key)!;
                    const strValue = String(value);
                    valueMap.set(strValue, (valueMap.get(strValue) || 0) + 1);
                  }
                });
              }
            });
            
            // Build property statistics
            allProperties.forEach(prop => {
              const values = propertyValues.get(prop);
              if (values && values.size > 0) {
                const totalUsage = Array.from(values.values()).reduce((a, b) => a + b, 0);
                
                // Get top 3 most common values
                const sortedValues = Array.from(values.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                
                const commonValuesStr = sortedValues
                  .map(([val, count]) => `${val} (${count})`)
                  .join(', ');
                
                propertyData.push({
                  property: prop,
                  count: totalUsage,
                  unique_values: values.size,
                  common_values: commonValuesStr + (values.size > 3 ? '...' : ''),
                  coverage_percentage: ((totalUsage / totalDocs) * 100).toFixed(1) + '%'
                });
              }
            });
            
            // Sort by usage count
            propertyData.sort((a, b) => b.count - a.count);
            
            // Print summary
            console.log(`\n📊 FRONTMATTER PROPERTIES ANALYSIS\n${'='.repeat(50)}\n`);
            console.log(`Total documents: ${totalDocs}`);
            console.log(`Unique properties found: ${allProperties.size}`);
            
            // Calculate average properties per document
            let totalProps = 0;
            docs.forEach((doc: any) => {
              if (doc.metadata && doc.metadata.frontmatter) {
                totalProps += Object.keys(doc.metadata.frontmatter).length;
              }
            });
            console.log(`Average properties per document: ${(totalProps / totalDocs).toFixed(2)}`);
            
            // Show top properties
            console.log(`\n🔝 Top 10 Most Used Properties:`);
            propertyData.slice(0, 10).forEach((prop, i) => {
              console.log(`  ${(i + 1).toString().padStart(2)}. ${prop.property}: ${prop.count} docs (${prop.coverage_percentage})`);
              console.log(`      Values: ${prop.common_values}`);
            });
            
            console.log('\n' + '='.repeat(50) + '\n');
            
            // Create table from property data
            const propTable = aq.from(propertyData.slice(0, 30)); // Top 30 properties
            
            return { table: propTable };
          }
        }
      ],
      
      output: [
        {
          format: 'table',
          destination: 'console'
        },
        {
          format: 'csv',
          destination: 'file',
          path: 'frontmatter-analysis.csv'
        }
      ],
      
      // Enable AI analysis for frontmatter patterns
      agentAnalysis: {
        enabled: true,
        model: 'sonnet'
      }
    };
  }
}