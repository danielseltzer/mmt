/**
 * Utility functions for formatting display values
 */

/**
 * Format a document count for display in tabs
 * - Numbers <= 999 are shown as-is
 * - Numbers >= 1000 are shown as "#.#k" format
 * 
 * Examples:
 * - 500 -> "500"
 * - 999 -> "999"
 * - 1000 -> "1.0k"
 * - 1950 -> "1.9k"
 * - 1999 -> "2.0k"
 * - 5992 -> "5.9k"
 * - 12345 -> "12.3k"
 * 
 * @param count The number of documents to format
 * @returns Formatted string representation
 */
export function formatDocumentCount(count: number): string {
  if (count <= 999) {
    return count.toString();
  }
  
  // For numbers >= 1000, format as k
  const thousands = count / 1000;
  
  // Truncate to 1 decimal place
  // This gives us: 1950 -> 1.9k, 5992 -> 5.9k
  const truncated = Math.floor(thousands * 10) / 10;
  
  // Format with 1 decimal place
  return `${truncated.toFixed(1)}k`;
}