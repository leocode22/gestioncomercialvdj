import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/employee', label: 'Mi panel', icon: '📊', end: true },
  { to: '/employee/objectives', label: 'Mis Objetivos', icon: '📝' },
  { to: '/employee/kpis', label: 'Mis KPIs', icon: '📈' },
  { to: '/employee/rewards', label: 'Recompensas', icon: '🎁' },
  { to: '/employee/leaderboard', label: 'Ranking', icon: '🏆' },
]

export default function EmployeeLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-dark-900 border-r border-dark-800 flex flex-col
        transform transition-transform duration-300 lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-brand-600/30">
              🎵
            </div>
            <div>
              <p className="font-bold text-white text-sm">VivirdeDJ</p>
              <p className="text-dark-400 text-xs">Panel Equipo</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-dark-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800 mb-3">
            <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold">
              {profile?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.name || 'Empleado'}</p>
              <p className="text-dark-400 text-xs">Equipo de ventas</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-all duration-200"
          >
            <span>🚪</span>
            {signingOut ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-dark-950/80 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-dark-900 border-b border-dark-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="font-bold text-white text-sm">Mi Panel</p>
          <div className="w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold">
            {profile?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
