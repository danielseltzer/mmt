import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Simple test script to verify analysis works
 */
export default class TestSimple implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            console.log('Table rows:', table.numRows());
            console.log('Table columns:', table.numCols());
            console.log('Column names:', table.columnNames());
            return table;
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