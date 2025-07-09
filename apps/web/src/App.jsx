import { useEffect } from 'react'
import { QueryBar } from './components/QueryBar'
import { DocumentTable } from './components/DocumentTable'
import { useDocumentStore } from './stores/document-store'
import './App.css'

function App() {
  const fetchDocuments = useDocumentStore(state => state.fetchDocuments)
  
  useEffect(() => {
    // Initial load
    fetchDocuments()
  }, [fetchDocuments])

  return (
    <div className="App">
      <header className="app-header">
        <h1>MMT - Markdown Management Toolkit</h1>
      </header>
      
      <main className="app-main">
        <div className="toolbar">
          <QueryBar />
        </div>
        
        <div className="content">
          <DocumentTable />
        </div>
      </main>
    </div>
  )
}

export default App
