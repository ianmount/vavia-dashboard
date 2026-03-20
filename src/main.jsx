import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import InternalDashboard from './InternalDashboard.jsx'

const isInternal = window.location.pathname.startsWith('/internal')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isInternal ? <InternalDashboard /> : <App />}
  </StrictMode>,
)
