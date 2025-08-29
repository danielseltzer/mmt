import { useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { QueryBar } from './components/QueryBar'
import { DocumentTable } from './components/DocumentTable'
import { TestHarness } from './components/TestHarness'
import { useDocumentStore } from './stores/document-store'

function App() {
  const loadVaults = useDocumentStore(state => state.loadVaults)
  const [isTestHarness, setIsTestHarness] = useState(false)
  
  useEffect(() => {
    // Check if we're in test harness mode via URL path
    const path = window.location.pathname
    if (path === '/test-harness' || path.startsWith('/test-harness')) {
      setIsTestHarness(true)
    }
    
    // Ensure dark mode is applied
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')
    
    // Load vaults on mount (tabs will be initialized automatically)
    loadVaults()
  }, [loadVaults])

  // Show test harness in development mode only
  if (isTestHarness && import.meta.env.DEV) {
    return <TestHarness />
  }

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
