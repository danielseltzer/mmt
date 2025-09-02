import React, { useMemo } from 'react';
import { TableView } from '@mmt/table-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SimilarityTableView({ 
  documents, 
  onFindSimilar,
  searchMode,
  ...props 
}) {
  // Enhanced documents with custom columns for similarity
  const enhancedDocuments = useMemo(() => {
    if (searchMode !== 'similarity') {
      return documents;
    }
    
    return documents.map(doc => {
      const score = doc.similarityScore || 0;
      const percentage = Math.round(score * 100);
      
      // Determine score color based on percentage
      let scoreColor = 'bg-gray-100 text-gray-700';
      let scoreVariant = 'secondary';
      if (percentage >= 70) {
        scoreColor = 'bg-green-100 text-green-800';
        scoreVariant = 'default';
      } else if (percentage >= 50) {
        scoreColor = 'bg-yellow-100 text-yellow-800';
        scoreVariant = 'outline';
      }
      
      return {
        ...doc,
        metadata: {
          ...doc.metadata,
          // Add custom fields for display
          _similarity: {
            score: percentage,
            color: scoreColor,
            variant: scoreVariant,
            raw: score
          },
          _actions: {
            path: doc.path,
            name: doc.metadata.name
          }
        }
      };
    });
  }, [documents, searchMode]);
  
  // Custom render function for similarity score
  const renderSimilarityScore = (doc) => {
    if (!doc.metadata._similarity) return null;
    
    const { score, color } = doc.metadata._similarity;
    
    return (
      <div className="flex items-center gap-2">
        <Badge 
          className={cn("font-mono text-xs", color)}
          variant="secondary"
        >
          {score}%
        </Badge>
        <div className="w-16 bg-secondary rounded-full h-1.5">
          <div 
            className={cn("h-full rounded-full transition-all", 
              score >= 70 ? "bg-green-500" : 
              score >= 50 ? "bg-yellow-500" : 
              "bg-gray-400"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    );
  };
  
  // Custom render function for actions
  const renderActions = (doc) => {
    if (!doc.metadata._actions) return null;
    
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={(e) => {
          e.stopPropagation();
          onFindSimilar(doc.metadata._actions.path);
        }}
        title={`Find documents similar to ${doc.metadata._actions.name}`}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Similar
      </Button>
    );
  };
  
  // Define initial columns based on search mode
  const initialColumns = searchMode === 'similarity' 
    ? ['name', 'path', 'similarity', 'actions', 'modified', 'size']
    : ['name', 'path', 'modified', 'size', 'tags'];
  
  return (
    <TableView 
      documents={enhancedDocuments}
      initialColumns={initialColumns}
      customColumns={searchMode === 'similarity' ? {
        similarity: {
          header: 'Similarity',
          accessor: (doc) => doc.metadata._similarity?.raw || 0,
          render: renderSimilarityScore,
          size: 140,
          sortable: true
        },
        actions: {
          header: 'Actions',
          render: renderActions,
          size: 100,
          sortable: false
        }
      } : {}}
      {...props}
    />
  );
}