import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Boot } from './app/Boot'
import './core/ui/tokens.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
