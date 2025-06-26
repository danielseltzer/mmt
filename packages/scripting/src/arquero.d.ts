// Type declarations for Arquero table operations used in this package
declare module 'arquero' {
  export interface Table {
    // Basic info
    numRows(): number;
    numCols(): number;
    columnNames(): string[];
    
    // Data access
    objects(): any[];
    object(index: number): any;
    
    // Selection and filtering
    select(...fields: string[]): Table;
    filter(predicate: string | ((d: any) => boolean)): Table;
    slice(start: number, end?: number): Table;
    sample(n: number): Table;
    
    // Transformation
    groupby(...fields: string[]): Table;
    count(): Table;
    dedupe(...fields: string[]): Table;
    orderby(...fields: string[]): Table;
    derive(spec: Record<string, (d: any) => any>): Table;
    rollup(spec: Record<string, any>): Table;
    
    // Output
    toCSV(): string;
    toJSON(): any[];
    toArray(): any[];
    
    // Utilities
    print(options?: any): Table;
  }
  
  // Export the table constructor
  export function table(data: any): Table;
  
  // Export common operations
  export const op: {
    count(): any;
    sum(field: string): any;
    mean(field: string): any;
    min(field: string): any;
    max(field: string): any;
  };
}