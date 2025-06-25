import * as aq from 'arquero';
import type { Table } from 'arquero';

/**
 * Re-export Arquero for scripts to use.
 * The actual document/table conversion functions are now in @mmt/document-set.
 */
export { aq };

/**
 * @deprecated Use fromTable from @mmt/document-set instead
 */
export { fromTable as tableToDocumentSet } from '@mmt/document-set';

/**
 * @deprecated Use documentsToTable from @mmt/document-set instead
 */
export { documentsToTable } from '@mmt/document-set';

/**
 * @deprecated Use materialize from @mmt/document-set instead
 */
export { materialize as materializeDocuments } from '@mmt/document-set';