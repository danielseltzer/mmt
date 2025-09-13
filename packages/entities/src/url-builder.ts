/**
 * @fileoverview URL builder utilities for constructing service URLs from components.
 * 
 * This module provides utilities to construct URLs from configuration components,
 * replacing hardcoded URLs throughout the application.
 */

import type { NetworkConfig, SimilarityConfig } from './config.schema.js';

/**
 * Build a URL from network configuration components.
 * 
 * @param network - Network configuration with host, ports, and protocol
 * @param service - The service to build URL for ('ollama' or 'qdrant')
 * @returns Constructed URL string
 */
export function buildServiceUrl(
  network: NetworkConfig,
  service: 'ollama' | 'qdrant'
): string {
  const port = network.ports[service];
  if (!port) {
    throw new Error(`No port configured for service: ${service}`);
  }
  
  return `${network.protocol}://${network.host}:${String(port)}`;
}

/**
 * Get Ollama URL from similarity configuration.
 * 
 * @param config - Similarity configuration
 * @returns Ollama service URL
 */
export function getOllamaUrl(config: SimilarityConfig): string {
  if (config.network) {
    return buildServiceUrl(config.network, 'ollama');
  }
  
  throw new Error('No Ollama URL configured. Please provide network configuration.');
}

/**
 * Get Qdrant URL from similarity configuration.
 * 
 * @param config - Similarity configuration
 * @returns Qdrant service URL
 */
export function getQdrantUrl(config: SimilarityConfig): string {
  if (config.network?.ports.qdrant) {
    return buildServiceUrl(config.network, 'qdrant');
  }
  
  throw new Error('No Qdrant URL configured. Please provide network configuration.');
}

/**
 * Build API server URL from host and port components.
 * 
 * @param host - Hostname or IP address
 * @param port - Port number
 * @param protocol - Protocol to use (default: 'http')
 * @returns API server URL
 */
export function buildApiUrl(
  host: string,
  port: number,
  protocol: 'http' | 'https' = 'http'
): string {
  return `${protocol}://${host}:${String(port)}`;
}