import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

export default class DebugFrontmatterColumns implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Analyze all documents
      
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            console.log('Available columns:', table.columnNames());
            console.log('\nFrontmatter columns:');
            table.columnNames().forEach((col: string) => {
              if (col.startsWith('fm_')) {
                console.log(`  - ${col}`);
              }
            });
            
            // Sample a few rows to see what data we have
            console.log('\nSample row with frontmatter:');
            const sample = table.filter((d: any) => {
              // Find a row with some frontmatter
              return Object.keys(d).some(k => k.startsWith('fm_') && d[k]);
            }).slice(0, 1);
            
            if (sample.numRows() > 0) {
              const row = sample.objects()[0];
              Object.keys(row).forEach(key => {
                if (key.startsWith('fm_') && row[key]) {
                  console.log(`  ${key}: ${row[key]}`);
                }
              });
            }
            
            return table.slice(0, 5); // Just return a few rows
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