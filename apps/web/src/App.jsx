import { useEffect } from 'react'
import { QueryBar } from './components/QueryBar'
import { DocumentTable } from './components/DocumentTable'
import { useDocumentStore } from './stores/document-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function App() {
  const fetchDocuments = useDocumentStore(state => state.fetchDocuments)
  
  useEffect(() => {
    // Initial load
    fetchDocuments()
  }, [fetchDocuments])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">MMT - Markdown Management Toolkit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <QueryBar />
              <Separator />
              <DocumentTable />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
