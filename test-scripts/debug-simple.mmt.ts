import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

export default class DebugSimple implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Analyze all documents
      
      operations: [
        { 
          type: 'custom',
          action: 'analyze',
          handler: (docs: any, { table }: any) => {
            console.log('Available columns:', table.columnNames());
            console.log('\nTotal columns:', table.columnNames().length);
            
            console.log('\nFirst document frontmatter:');
            const firstDoc = docs[0];
            console.log('Document metadata:', firstDoc.metadata);
            
            if (firstDoc.metadata.frontmatter) {
              console.log('Frontmatter keys:', Object.keys(firstDoc.metadata.frontmatter));
            }
            
            return { table: table.slice(0, 5) };
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