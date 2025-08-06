import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Check if Ollama is available and running
 * @param ollamaUrl The URL where Ollama should be running (default: http://localhost:11434)
 * @returns true if Ollama is available, false otherwise
 */
export async function isOllamaAvailable(ollamaUrl = 'http://localhost:11434'): Promise<boolean> {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Assert that Ollama is available, failing the test if not
 * @param ollamaUrl The URL where Ollama should be running
 */
export async function requireOllama(ollamaUrl = 'http://localhost:11434'): Promise<void> {
  const available = await isOllamaAvailable(ollamaUrl);
  if (!available) {
    throw new Error(
      `Ollama is not available at ${ollamaUrl}. ` +
      `Please ensure Ollama is running before running similarity search tests. ` +
      `You can start Ollama with: ollama serve`
    );
  }
}

/**
 * Generate test markdown documents with specified content themes
 */
export interface TestDocument {
  filename: string;
  content: string;
  topic: string;
}

export function generateTestDocuments(): TestDocument[] {
  return [
    // Woodworking cluster
    {
      filename: 'oak-bookshelf-project.md',
      topic: 'woodworking',
      content: `# Oak Bookshelf Project

Building a beautiful oak bookshelf using traditional joinery techniques.

## Materials
- Red oak boards (1x12x8)
- Wood glue
- Danish oil finish
- Brass shelf pins

## Tools Required
- Table saw
- Router
- Chisels
- Clamps

## Steps
1. Cut boards to length
2. Route dados for shelves
3. Sand all surfaces
4. Apply finish`
    },
    {
      filename: 'walnut-cutting-board.md',
      topic: 'woodworking',
      content: `# Walnut End-Grain Cutting Board

Creating a durable end-grain cutting board from black walnut.

## Materials
- Black walnut lumber
- Food-safe mineral oil
- Beeswax

## Process
The end-grain construction provides a self-healing surface that's gentle on knives.
Careful attention to grain direction ensures stability.`
    },
    {
      filename: 'dovetail-joints-guide.md',
      topic: 'woodworking',
      content: `# Mastering Dovetail Joints

A comprehensive guide to cutting perfect dovetail joints by hand.

## Tools
- Dovetail saw
- Marking gauge
- Sharp chisels
- Coping saw

Dovetail joints are the hallmark of fine furniture making.`
    },
    // Cooking cluster
    {
      filename: 'sourdough-bread-recipe.md',
      topic: 'cooking',
      content: `# Artisan Sourdough Bread

A reliable recipe for crusty sourdough with an open crumb.

## Ingredients
- Bread flour
- Whole wheat flour
- Active sourdough starter
- Salt
- Water

## Method
Long fermentation develops complex flavors and improves digestibility.`
    },
    {
      filename: 'pasta-carbonara.md',
      topic: 'cooking',
      content: `# Authentic Pasta Carbonara

The classic Roman pasta dish with eggs, cheese, and guanciale.

## Ingredients
- Spaghetti or rigatoni
- Guanciale (or pancetta)
- Pecorino Romano
- Fresh eggs
- Black pepper

No cream needed for this traditional recipe!`
    },
    {
      filename: 'thai-green-curry.md',
      topic: 'cooking',
      content: `# Thai Green Curry

A fragrant and spicy Thai curry with vegetables and herbs.

## Key Ingredients
- Green curry paste
- Coconut milk
- Thai basil
- Kaffir lime leaves
- Fish sauce

Balance of sweet, salty, sour, and spicy flavors.`
    },
    // Technology cluster
    {
      filename: 'react-hooks-guide.md',
      topic: 'technology',
      content: `# React Hooks Best Practices

Understanding and implementing React hooks effectively.

## Core Hooks
- useState for component state
- useEffect for side effects
- useContext for shared state
- useMemo for expensive computations

Hooks enable functional components with state and lifecycle.`
    },
    {
      filename: 'docker-compose-tutorial.md',
      topic: 'technology',
      content: `# Docker Compose for Development

Setting up multi-container applications with Docker Compose.

## Services
- Web application container
- Database container
- Redis cache container
- Nginx reverse proxy

Orchestrate your entire development environment with one command.`
    },
    // Edge cases
    {
      filename: 'empty-document.md',
      topic: 'empty',
      content: ''
    },
    {
      filename: 'whitespace-only.md',
      topic: 'empty',
      content: '   \n\n\t\t  \n   '
    }
  ];
}

/**
 * Create a temporary test vault with the specified documents
 * @returns Path to the created test vault
 */
export async function createTestVault(documents: TestDocument[]): Promise<string> {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'mmt-similarity-test-'));
  
  for (const doc of documents) {
    const filePath = path.join(vaultPath, doc.filename);
    await fs.writeFile(filePath, doc.content, 'utf-8');
  }
  
  return vaultPath;
}

/**
 * Clean up a test vault
 */
export async function cleanupTestVault(vaultPath: string): Promise<void> {
  await fs.rm(vaultPath, { recursive: true, force: true });
}

/**
 * Create a temporary directory for index storage
 */
export async function createTestIndexPath(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'mmt-similarity-index-'));
}

/**
 * Parse error log file and return structured errors
 */
export interface IndexingError {
  path: string;
  error: string;
  timestamp: string;
}

export async function parseErrorLog(errorLogPath: string): Promise<{
  summary: {
    totalDocuments: number;
    successfullyIndexed: number;
    failed: number;
    successPercentage: number;
  };
  errors: IndexingError[];
}> {
  const content = await fs.readFile(errorLogPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Parse summary from first few lines
  const summaryMatch = content.match(
    /Total documents: (\d+)\s*\n\s*Successfully indexed: (\d+)\s*\n\s*Failed: (\d+)\s*\n\s*Success rate: ([\d.]+)%/
  );
  
  if (!summaryMatch) {
    throw new Error('Could not parse error log summary');
  }
  
  const summary = {
    totalDocuments: parseInt(summaryMatch[1]),
    successfullyIndexed: parseInt(summaryMatch[2]),
    failed: parseInt(summaryMatch[3]),
    successPercentage: parseFloat(summaryMatch[4])
  };
  
  // Parse individual errors
  const errors: IndexingError[] = [];
  const errorSection = content.split('ERRORS:')[1];
  if (errorSection) {
    const errorLines = errorSection.trim().split('\n');
    for (const line of errorLines) {
      const match = line.match(/\[(.*?)\] (.*?): (.*)/);
      if (match) {
        errors.push({
          timestamp: match[1],
          path: match[2],
          error: match[3]
        });
      }
    }
  }
  
  return { summary, errors };
}