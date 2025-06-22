import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Test script for agent analysis feature.
 * Demonstrates how to enable AI-powered analysis of report results.
 * 
 * Usage:
 * pnpm mmt --config config.yaml script test-scripts/test-agent-analysis.mmt.ts --report
 * 
 * This will generate a report with Claude's analysis appended.
 */
export default class TestAgentAnalysis implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        {
          type: 'analyze',
          transform: (table: any) => {
            // Find most-linked documents
            return table
              .filter((d: any) => d.backlinks_count > 0)
              .orderby(aq.desc('backlinks_count'))
              .select('name', 'path', 'backlinks_count', 'backlinks')
              .slice(0, 20); // Top 20 for agent to analyze
          }
        }
      ],
      output: [
        {
          format: 'table',
          destination: 'console'
        }
      ],
      // Enable agent analysis with default settings
      agentAnalysis: {
        enabled: true,
        model: 'sonnet'
      }
    };
  }
}