import { useEffect } from 'react'
import { TabBar } from './components/TabBar'
import { QueryBar } from './components/QueryBar'
import { DocumentTable } from './components/DocumentTable'
import { useDocumentStore } from './stores/document-store'

function App() {
  const loadVaults = useDocumentStore(state => state.loadVaults)
  
  useEffect(() => {
    // Ensure dark mode is applied
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')
    
    // Load vaults on mount (tabs will be initialized automatically)
    loadVaults()
  }, [loadVaults])

  return (
    <div className="h-screen flex flex-col bg-background">
      <TabBar />
      <div className="flex-1 flex flex-col p-2">
        <QueryBar />
        <DocumentTable />
      </div>
    </div>
  )
}

export default App
