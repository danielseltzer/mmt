import { useEffect } from 'react'
import { QueryBar } from './components/QueryBar'
import { DocumentTable } from './components/DocumentTable'
import { useDocumentStore } from './stores/document-store'

function App() {
  const fetchDocuments = useDocumentStore(state => state.fetchDocuments)
  
  useEffect(() => {
    // Ensure dark mode is applied
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')
    
    // Initial load
    fetchDocuments()
  }, [fetchDocuments])

  return (
    <div className="h-screen flex flex-col bg-background p-2">
      <QueryBar />
      <DocumentTable />
    </div>
  )
}

export default App
