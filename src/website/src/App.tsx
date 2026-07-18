import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import OwnerApp from './owner/App'
import CollectorApp from './collector/App'
import './styles/app.css'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute requiredRole="owner" />}>
        <Route path="/owner/*" element={<OwnerApp />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="collector" />}>
        <Route path="/collector/*" element={<CollectorApp />} />
      </Route>
      <Route path="/" element={<Navigate replace to="/login" />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
