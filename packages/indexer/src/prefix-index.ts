/**
 * Prefix tree (trie) for efficient path queries
 * Allows finding all files under a given path prefix
 */

export class PrefixIndex {
  private root: PrefixNode = new PrefixNode();
  
  /**
   * Add a path to the index
   */
  add(path: string): void {
    const parts = this.splitPath(path);
    let node = this.root;
    
    for (const part of parts) {
      if (!node.children.has(part)) {
        node.children.set(part, new PrefixNode());
      }
      node = node.children.get(part)!;
    }
    
    node.files.add(path);
  }
  
  /**
   * Remove a path from the index
   */
  remove(path: string): void {
    const parts = this.splitPath(path);
    this.removeRecursive(this.root, parts, 0, path);
  }
  
  /**
   * Find all paths with the given prefix
   */
  find(prefix: string): Set<string> {
    const parts = this.splitPath(prefix);
    let node = this.root;
    
    // Navigate to the prefix node
    for (const part of parts) {
      if (!node.children.has(part)) {
        return new Set(); // Prefix not found
      }
      node = node.children.get(part)!;
    }
    
    // Collect all files under this prefix
    const results = new Set<string>();
    this.collectFiles(node, results);
    
    return results;
  }
  
  /**
   * Split a path into parts
   */
  private splitPath(path: string): string[] {
    return path.split('/').filter(p => p.length > 0);
  }
  
  /**
   * Recursively remove a path and clean up empty nodes
   */
  private removeRecursive(node: PrefixNode, parts: string[], index: number, fullPath: string): boolean {
    if (index === parts.length) {
      node.files.delete(fullPath);
      return node.files.size === 0 && node.children.size === 0;
    }
    
    const part = parts[index];
    const child = node.children.get(part);
    
    if (!child) return false;
    
    const shouldRemoveChild = this.removeRecursive(child, parts, index + 1, fullPath);
    
    if (shouldRemoveChild) {
      node.children.delete(part);
    }
    
    return node.files.size === 0 && node.children.size === 0;
  }
  
  /**
   * Collect all files under a node
   */
  private collectFiles(node: PrefixNode, results: Set<string>): void {
    // Add files at this node
    for (const file of node.files) {
      results.add(file);
    }
    
    // Recursively collect from children
    for (const child of node.children.values()) {
      this.collectFiles(child, results);
    }
  }
}

/**
 * Node in the prefix tree
 */
class PrefixNode {
  children = new Map<string, PrefixNode>();
  files = new Set<string>();
}