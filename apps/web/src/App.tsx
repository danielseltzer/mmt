import { useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { QueryBar } from './components/QueryBar'
import { DocumentTable } from './components/DocumentTable'
import { TestHarness } from './components/TestHarness'
import { StatusBar } from './components/StatusBar'
import { OperationTabs } from './components/OperationTabs'
import { FilterBar } from './components/FilterBar'
import { TransformPanel } from './components/TransformPanel'
import { OutputPanel } from './components/OutputPanel'
import { useDocumentStore } from './stores/document-store'

function App() {
  const loadVaults = useDocumentStore(state => state.loadVaults)
  const [isTestHarness, setIsTestHarness] = useState(false)
  const [activeOperation, setActiveOperation] = useState<'search' | 'filter' | 'transform' | 'output'>('search')
  const [operations, setOperations] = useState([])
  const [outputFormat, setOutputFormat] = useState('json')

  useEffect(() => {
    // Check if we're in test harness mode via URL path
    const path = window.location.pathname
    if (path === '/test-harness' || path.startsWith('/test-harness')) {
      setIsTestHarness(true)
    }

    // Ensure dark mode is applied
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')

    // Load vaults directly - no complex initialization needed
    loadVaults()
  }, []) // Remove loadVaults from dependencies to prevent infinite loop

  // Show test harness in development mode only
  if (isTestHarness && import.meta.env.DEV) {
    return <TestHarness />
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TabBar />
      <div className="flex-1 flex flex-col p-2 pb-10">
        <div className="flex items-center justify-between mb-2">
          <OperationTabs activeTab={activeOperation} onTabChange={setActiveOperation} />
        </div>
        
        {/* Show content based on active operation */}
        {activeOperation === 'search' && <QueryBar />}
        {activeOperation === 'filter' && (
          <div className="border rounded-lg p-3">
            <FilterBar />
          </div>
        )}
        {activeOperation === 'transform' && (
          <div className="border rounded-lg p-3">
            <TransformPanel 
              operations={operations} 
              onOperationsChange={setOperations}
            />
          </div>
        )}
        {activeOperation === 'output' && (
          <div className="border rounded-lg p-3">
            <OutputPanel 
              onFormatChange={setOutputFormat}
            />
          </div>
        )}
        
        <DocumentTable />
      </div>
      <StatusBar />
    </div>
  )
}

export default App
