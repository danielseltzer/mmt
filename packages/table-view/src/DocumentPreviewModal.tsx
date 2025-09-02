import React, { useState, useEffect } from 'react';
import { FileText, Calendar, HardDrive, Tag, Hash, Loader2, AlertCircle, X } from 'lucide-react';
import { Loggers } from '@mmt/logger';
import { getApiEndpoint } from './config/api';

const logger = Loggers.web();

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentPath: string;
  vaultId: string;
}

interface PreviewData {
  path: string;
  fullPath: string;
  preview: string;
  metadata: {
    title?: string;
    size?: number;
    mtime?: string;
    tags?: string[];
    frontmatter?: Record<string, any>;
  };
  hasMore?: boolean;
}

export function DocumentPreviewModal({ 
  isOpen, 
  onClose, 
  documentPath,
  vaultId
}: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch preview data when modal opens
  useEffect(() => {
    if (isOpen && documentPath && vaultId) {
      fetchPreview();
    }
  }, [isOpen, documentPath, vaultId]);

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Encode the path to handle special characters
      const encodedPath = encodeURIComponent(documentPath);
      const response = await fetch(
        getApiEndpoint(`/api/vaults/${vaultId}/documents/preview/${encodedPath}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.statusText}`);
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (err: any) {
      logger.error('Failed to fetch document preview:', err);
      setError(err.message || 'Failed to load document preview');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Preview
              </h2>
              {previewData && (
                <p className="text-sm text-muted-foreground mt-1">
                  {previewData.path}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          {previewData && !isLoading && !error && (
            <div className="space-y-4">
              {/* Metadata Section */}
              <div className="space-y-2 pb-3 border-b">
                {previewData.metadata.title && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium min-w-[80px] text-muted-foreground">Title:</span>
                    <span className="text-sm">{previewData.metadata.title}</span>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium min-w-[80px] text-muted-foreground flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    Size:
                  </span>
                  <span className="text-sm">{formatFileSize(previewData.metadata.size)}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium min-w-[80px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Modified:
                  </span>
                  <span className="text-sm">{formatDate(previewData.metadata.mtime)}</span>
                </div>

                {previewData.metadata.tags && previewData.metadata.tags.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium min-w-[80px] text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {previewData.metadata.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-0.5 text-xs bg-secondary rounded-full flex items-center gap-0.5">
                          <Hash className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.metadata.frontmatter && Object.keys(previewData.metadata.frontmatter).length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium min-w-[80px] text-muted-foreground">Metadata:</span>
                    <div className="text-sm space-y-1">
                      {Object.entries(previewData.metadata.frontmatter).slice(0, 5).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-medium">{key}:</span>
                          <span className="text-muted-foreground">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                      {Object.keys(previewData.metadata.frontmatter).length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          ... and {Object.keys(previewData.metadata.frontmatter).length - 5} more properties
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Content Preview Section */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Content Preview:</div>
                <div className="bg-muted/30 rounded-md p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {previewData.preview}
                  </pre>
                  {previewData.hasMore && (
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      ... (document continues)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}