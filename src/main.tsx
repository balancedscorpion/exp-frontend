import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AppShell } from './components/AppShell'
import { ExperimentsListPage } from './pages/ExperimentsListPage'
import { ExperimentCreatePage } from './pages/ExperimentCreatePage'
import { ExperimentDetailPage } from './pages/ExperimentDetailPage'
import { DebuggerPage } from './pages/DebuggerPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/experiments" replace />} />
          <Route path="/experiments" element={<ExperimentsListPage />} />
          <Route path="/experiments/new" element={<ExperimentCreatePage />} />
          <Route path="/experiments/:id" element={<ExperimentDetailPage />} />
          <Route path="/debugger" element={<DebuggerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
