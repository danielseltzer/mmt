import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App'
// import SimpleApp from './SimpleApp'
import { ErrorBoundary } from './components/ErrorBoundary'
import { configureApiBaseUrl } from '@mmt/table-view'
import { API_BASE_URL } from './config/api'

// Configure the TableView package with the API base URL
configureApiBaseUrl(API_BASE_URL);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
