import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { SkeletonWrapper } from './components/skeletons'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SkeletonWrapper>
        <App />
      </SkeletonWrapper>
    </AuthProvider>
  </StrictMode>,
)
