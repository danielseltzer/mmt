import React from 'react';
import ReactDOM from 'react-dom/client';
import { TableView } from '../src/TableView';
import type { Document } from '@mmt/entities';
import '../demo/styles.css';

// Generate test documents
function generateDocuments(count: number): Document[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `/vault/documents/file-${i + 1}.md`,
    content: `This is the content of document ${i + 1}`,
    metadata: {
      name: `file-${i + 1}`,
      modified: new Date(2024, 0, Math.floor(Math.random() * 30) + 1),
      size: Math.floor(Math.random() * 10000) + 1000,
      frontmatter: {
        title: `Document ${i + 1}`,
        author: ['Alice', 'Bob', 'Charlie'][i % 3],
      },
      tags: [`tag-${i % 5}`, `category-${i % 3}`],
      links: [],
    },
  }));
}

function App() {
  const [selectedPaths, setSelectedPaths] = React.useState<string[]>([]);
  const documents = React.useMemo(() => generateDocuments(600), []); // More than 500 to see limit

  const handleOperationRequest = (request: { operation: string; documentPaths: string[] }) => {
    alert(`Operation: ${request.operation}\nSelected: ${request.documentPaths.length} documents`);
  };

  const handleLoadContent = async (path: string) => {
    // Simulate loading content
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Preview content for ${path}`;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <h1>Table View Demo</h1>
        <p>Selected: {selectedPaths.length} documents</p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TableView
          documents={documents}
          onSelectionChange={setSelectedPaths}
          onOperationRequest={handleOperationRequest}
          onLoadContent={handleLoadContent}
          initialColumns={['name', 'modified', 'size', 'tags']} // Start without preview
        />
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);