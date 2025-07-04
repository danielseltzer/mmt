import { create } from 'zustand';
import type { ScriptOperation } from '@mmt/entities';
import { api } from '../api/client.js';

export interface QueuedOperation {
  id: string;
  operation: ScriptOperation;
  documentPaths: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: {
    current: number;
    total: number;
  };
  error?: string;
  result?: {
    succeeded: number;
    failed: number;
    skipped: number;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface OperationStore {
  // State
  queue: QueuedOperation[];
  isProcessing: boolean;
  
  // Computed
  pendingOperations: QueuedOperation[];
  runningOperation: QueuedOperation | null;
  completedOperations: QueuedOperation[];
  
  // Actions
  addOperation: (operation: ScriptOperation, documentPaths: string[]) => string;
  cancelOperation: (operationId: string) => void;
  clearCompleted: () => void;
  processQueue: () => Promise<void>;
  
  // Private actions
  updateOperation: (operationId: string, updates: Partial<QueuedOperation>) => void;
}

export const useOperationStore = create<OperationStore>((set, get) => ({
  // Initial state
  queue: [],
  isProcessing: false,
  
  // Computed
  get pendingOperations() {
    return get().queue.filter(op => op.status === 'pending');
  },
  
  get runningOperation() {
    return get().queue.find(op => op.status === 'running') ?? null;
  },
  
  get completedOperations() {
    return get().queue.filter(op => 
      op.status === 'completed' || op.status === 'failed'
    );
  },
  
  // Actions
  addOperation: (operation, documentPaths) => {
    const id = `op-${Date.now()}`;
    const queuedOp: QueuedOperation = {
      id,
      operation,
      documentPaths,
      status: 'pending',
      createdAt: new Date(),
    };
    
    set(state => ({ queue: [...state.queue, queuedOp] }));
    
    // Automatically start processing if not already running
    if (!get().isProcessing) {
      void get().processQueue();
    }
    
    return id;
  },
  
  cancelOperation: (operationId) => {
    const op = get().queue.find(o => o.id === operationId);
    if (!op || op.status !== 'pending') return;
    
    set(state => ({
      queue: state.queue.filter(o => o.id !== operationId),
    }));
  },
  
  clearCompleted: () => {
    set(state => ({
      queue: state.queue.filter(op => 
        op.status !== 'completed' && op.status !== 'failed'
      ),
    }));
  },
  
  processQueue: async () => {
    const { isProcessing, pendingOperations } = get();
    if (isProcessing || pendingOperations.length === 0) return;
    
    set({ isProcessing: true });
    
    try {
      while (get().pendingOperations.length > 0) {
        const nextOp = get().pendingOperations[0];
        if (!nextOp) break;
        
        // Update status to running
        get().updateOperation(nextOp.id, {
          status: 'running',
          startedAt: new Date(),
        });
        
        try {
          // Execute operation via tRPC
          const result = await api.operations.execute.mutate({
            operation: nextOp.operation,
            documentPaths: nextOp.documentPaths,
            options: {
              dryRun: false,
              updateLinks: true,
              continueOnError: true,
            },
          });
          
          // Update with success
          get().updateOperation(nextOp.id, {
            status: 'completed',
            completedAt: new Date(),
            result: {
              succeeded: result.succeeded.length,
              failed: result.failed.length,
              skipped: result.skipped.length,
            },
          });
        } catch (error) {
          // Update with failure
          get().updateOperation(nextOp.id, {
            status: 'failed',
            completedAt: new Date(),
            error: error instanceof Error ? error.message : 'Operation failed',
          });
        }
      }
    } finally {
      set({ isProcessing: false });
    }
  },
  
  // Private actions
  updateOperation: (operationId, updates) => {
    set(state => ({
      queue: state.queue.map(op =>
        op.id === operationId ? { ...op, ...updates } : op
      ),
    }));
  },
}));