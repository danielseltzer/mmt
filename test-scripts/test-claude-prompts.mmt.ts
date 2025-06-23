import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';
import { readFile } from 'fs/promises';
import { writeFile } from 'fs/promises';

/**
 * Test Claude Prompt Generation
 * =============================
 * 
 * This script tests different prompt variations for generating report summaries.
 * It loads a report and generates multiple prompt variations for evaluation.
 * 
 * Usage:
 * pnpm mmt --config config.yaml script test-scripts/test-claude-prompts.mmt.ts
 */
export default class TestClaudePrompts implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: {}, // Select all files (we'll handle the report loading directly)
      operations: [
        {
          type: 'custom',
          action: 'analyze',
          handler: async (docs: any) => {
            console.log('\n🧪 CLAUDE PROMPT GENERATION TESTBED\n');
            
            // Load the report
            const reportPath = '/Users/danielseltzer/code/mmt/reports/most-linked-documents.md';
            const reportContent = await readFile(reportPath, 'utf-8');
            
            // Extract just the results section for more focused prompts
            const resultsStart = reportContent.indexOf('## Analysis Results');
            const resultsEnd = reportContent.indexOf('## Metadata');
            const resultsSection = reportContent.slice(resultsStart, resultsEnd).trim();
            
            // Define prompt variations
            const prompts = [
              {
                name: 'Universal Minimal',
                prompt: `Analyze this vault analysis report and summarize in 2-3 sentences what the data reveals about knowledge organization patterns:\n\n${resultsSection}`
              },
              {
                name: 'Universal Detailed', 
                prompt: `I have a markdown report from analyzing backlinks in my personal knowledge vault. Please provide a concise summary (2-3 sentences) identifying the critical insights about my knowledge organization patterns and note-taking habits.\n\nFocus on:\n1. What the most-linked documents reveal about recurring themes or knowledge hubs\n2. What the linking patterns suggest about how I organize and connect information\n3. Any notable patterns in the ratio of documents to connections\n\nHere's the report:\n\n${resultsSection}`
              },
              {
                name: 'Report-Specific',
                prompt: `This report shows the 20 most-linked-to documents in a personal knowledge vault of 5,920 total documents. Analyze what these most-referenced documents and their backlink counts reveal about the vault owner's knowledge management patterns and primary areas of focus. Provide a 2-3 sentence summary of key insights.\n\n${resultsSection}`
              },
              {
                name: 'Action-Oriented',
                prompt: `Based on this backlink analysis report, summarize in 2-3 sentences: (1) What knowledge hubs or themes emerge from the most-linked documents, and (2) What actions might improve knowledge connectivity given these patterns.\n\n${resultsSection}`
              },
              {
                name: 'Pattern-Focused',
                prompt: `Examine the titles and backlink counts in this report. In 2-3 sentences, describe the patterns you observe in what types of documents attract the most references and what this suggests about the vault's organization.\n\n${resultsSection}`
              }
            ];
            
            // Generate output file with all prompts
            let output = '# Claude Prompt Variations Test\n\n';
            output += `Report: ${reportPath}\n`;
            output += `Generated: ${new Date().toISOString()}\n\n`;
            output += '---\n\n';
            
            prompts.forEach((p, i) => {
              output += `## Variation ${i + 1}: ${p.name}\n\n`;
              output += '### Prompt:\n```\n';
              output += p.prompt.substring(0, 500) + '...\n';
              output += '```\n\n';
              output += '### Full Prompt Length: ' + p.prompt.length + ' characters\n\n';
              output += '### Expected Focus:\n';
              
              switch(p.name) {
                case 'Universal Minimal':
                  output += '- Most flexible, relies on Claude to determine relevance\n';
                  break;
                case 'Universal Detailed':
                  output += '- Guided analysis with specific focus areas\n';
                  break;
                case 'Report-Specific':
                  output += '- Contextualizes the data type and size\n';
                  break;
                case 'Action-Oriented':
                  output += '- Emphasizes actionable insights\n';
                  break;
                case 'Pattern-Focused':
                  output += '- Focuses on pattern recognition\n';
                  break;
              }
              
              output += '\n---\n\n';
            });
            
            // Save test prompts
            const outputPath = '/Users/danielseltzer/code/mmt/reports/claude-prompt-test.md';
            await writeFile(outputPath, output, 'utf-8');
            
            // Also save individual prompt files for easy testing
            for (const [i, p] of prompts.entries()) {
              const fileName = `/Users/danielseltzer/code/mmt/reports/prompt-${i + 1}-${p.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
              await writeFile(fileName, p.prompt, 'utf-8');
              console.log(`✓ Generated: ${fileName}`);
            }
            
            console.log(`\n✓ Test summary saved to: ${outputPath}`);
            console.log('\nYou can now test each prompt with Claude and compare results.');
            
            return { promptsGenerated: prompts.length };
          }
        }
      ],
      output: [
        {
          format: 'summary',
          destination: 'console'
        }
      ]
    };
  }
}