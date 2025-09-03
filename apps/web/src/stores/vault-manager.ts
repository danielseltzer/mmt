/**
 * Vault Manager - Handles vault loading and status management
 * Extracted from document-store.ts to improve maintainability
 */

import type { Vault, VaultIndexStatus } from './types.js';
import { API_ENDPOINTS } from '../config/api.js';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

/**
 * Load all available vaults from the API
 */
export async function loadVaults(): Promise<Vault[]> {
  const response = await fetch(API_ENDPOINTS.vaults());
  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[loadVaults] API error response:', errorText);
    throw new Error(`Failed to load vaults: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.vaults || [];
}

/**
 * Get vault index status
 */
export async function getVaultIndexStatus(vaultId: string): Promise<VaultIndexStatus | null> {
  try {
    const response = await fetch(API_ENDPOINTS.vaultStatus(vaultId));
    if (!response.ok) {
      logger.error(`Failed to get vault status for ${vaultId}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    logger.error(`Error getting vault status for ${vaultId}:`, error);
    return null;
  }
}

/**
 * Vault status manager class
 */
export class VaultStatusManager {
  private statuses: Map<string, VaultIndexStatus> = new Map();
  
  /**
   * Update vault status
   */
  updateStatus(vaultId: string, status: VaultIndexStatus): void {
    this.statuses.set(vaultId, status);
  }
  
  /**
   * Get vault status
   */
  getStatus(vaultId: string): VaultIndexStatus | undefined {
    return this.statuses.get(vaultId);
  }
  
  /**
   * Clear all statuses
   */
  clear(): void {
    this.statuses.clear();
  }
  
  /**
   * Get all statuses as a new Map
   */
  getAllStatuses(): Map<string, VaultIndexStatus> {
    return new Map(this.statuses);
  }
}