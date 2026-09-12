import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted (no external font CDN — consistent with this app's `connect-src
// 'self'` / nothing-leaves-the-device design). Only the weights actually used.
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
