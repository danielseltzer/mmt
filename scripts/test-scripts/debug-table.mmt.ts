import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

export default class DebugTable implements Script {
  define(context: ScriptContext): OperationPipeline {
    console.log('Script define called');
    console.log('Context keys:', Object.keys(context));
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'custom',
          action: 'debug',
          handler: (docs: any) => {
            console.log('Documents received:', docs.length);
            if (docs.length > 0) {
              console.log('First doc:', JSON.stringify(docs[0], null, 2));
            }
            return { analyzed: docs.length };
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