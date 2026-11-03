import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import { App } from './App'
import { ToastProvider } from '@/components/ui/toast'

const container = document.getElementById('root')
if (!container) throw new Error('Elemen #root tidak ditemukan.')

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
