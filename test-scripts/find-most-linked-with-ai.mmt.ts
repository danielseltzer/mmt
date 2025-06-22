import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find Most-Linked Documents with AI Analysis
 * ===========================================
 * 
 * This script demonstrates MMT's bidirectional link extraction capabilities by
 * finding the documents that are referenced most frequently by other documents
 * in your vault, then uses Claude to analyze the patterns found.
 * 
 * USE CASE:
 * - Identify your most important/central documents based on how often they're referenced
 * - Find key concept pages that many other notes link to
 * - Discover which recipes, projects, or ideas are referenced most
 * - Get AI-powered insights about your knowledge organization patterns
 * 
 * HOW IT WORKS:
 * 1. The indexer extracts all [[wikilinks]] and [markdown](links) from every document
 * 2. For each document, it counts incoming links (backlinks) from other documents
 * 3. Results are sorted by backlink count to show the most-referenced documents first
 * 4. Claude analyzes the results to identify knowledge hubs and organizational patterns
 * 
 * EXAMPLE OUTPUT:
 * name                          | path                      | backlinks_count | backlinks
 * ------------------------------|---------------------------|-----------------|---------------------------
 * Measured Granola Recipe       | /vault/Food/Granola.md    | 3               | Food/Log1.md, Food/Log2.md...
 * Home Assistant Setup          | /vault/Tech/HA.md         | 2               | Tech/Pi.md, Tech/Network.md
 * 
 * Plus AI analysis identifying themes and patterns in your linking structure.
 * 
 * @example
 * ```bash
 * # Run on your vault with AI analysis
 * pnpm mmt --config your-vault.yaml script test-scripts/find-most-linked-with-ai.mmt.ts --report
 * ```
 */
export default class FindMostLinkedDocumentsWithAI implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any; // Arquero data manipulation library
    
    return {
      select: {}, // Select all documents in the vault
      
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            // Filter to only documents that have at least one backlink
            .filter((d: any) => d.backlinks_count > 0)
            
            // Sort by backlink count (highest first)
            .orderby(aq.desc('backlinks_count'))
            
            // Select the columns we want to display
            .select('name', 'path', 'backlinks_count', 'backlinks')
            
            // Limit to top 20 most-linked documents
            .slice(0, 20)
        }
      ],
      
      output: [
        {
          format: 'table', // Display results as a formatted table
          destination: 'console'
        },
        {
          format: 'csv', // Also save as CSV for further analysis
          destination: 'file',
          path: 'most-linked-documents.csv'
        }
      ],
      
      // Enable AI-powered analysis of the results
      agentAnalysis: {
        enabled: true,
        model: 'sonnet' // Uses Claude Sonnet for analysis
      }
    };
  }
}