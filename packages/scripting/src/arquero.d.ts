// Type declarations for Arquero table operations used in this package
declare module 'arquero' {
  export interface Table {
    numRows(): number;
    numCols(): number;
    objects(): any[];
    select(...fields: string[]): Table;
    groupby(...fields: string[]): Table;
    count(): Table;
    dedupe(...fields: string[]): Table;
    filter(predicate: (d: any) => boolean): Table;
    toCSV(): string;
    toJSON(): any[];
  }
}