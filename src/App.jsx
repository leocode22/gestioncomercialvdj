import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminObjectives from './pages/admin/AdminObjectives'
import AdminPoints from './pages/admin/AdminPoints'
import AdminRewards from './pages/admin/AdminRewards'
import AdminLeaderboard from './pages/admin/AdminLeaderboard'
import EmployeeLayout from './pages/employee/EmployeeLayout'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import EmployeeKPI from './pages/employee/EmployeeKPI'
import EmployeeRewards from './pages/employee/EmployeeRewards'
import EmployeeLeaderboard from './pages/employee/EmployeeLeaderboard'

function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (allowedRole && profile?.role !== allowedRole) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/employee'} replace />
  }

  return children
}

function RootRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/employee" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="objectives" element={<AdminObjectives />} />
        <Route path="points" element={<AdminPoints />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="leaderboard" element={<AdminLeaderboard />} />
      </Route>

      {/* Employee Routes */}
      <Route path="/employee" element={
        <ProtectedRoute allowedRole="employee">
          <EmployeeLayout />
        </ProtectedRoute>
      }>
        <Route index element={<EmployeeDashboard />} />
        <Route path="objectives" element={<EmployeeKPI />} />
        <Route path="rewards" element={<EmployeeRewards />} />
        <Route path="leaderboard" element={<EmployeeLeaderboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
