import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { cache } from '../../lib/cache'
import StatCard from '../../components/StatCard'
import ProgressBar from '../../components/ProgressBar'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, activeObjectives: 0, totalPoints: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const cached = cache.get('admin:dashboard')
    if (cached) {
      setEmployees(cached.employees)
      setStats(cached.stats)
      setLoading(false)
      return
    }
    setLoading(true)

    const now = new Date().toISOString().split('T')[0]

    // 3 queries en paralelo en lugar de 1 + 2×N queries en cascada
    const [{ data: users }, { data: allObjectives }, { data: allPointTx }] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'employee').order('name'),
      supabase.from('objectives').select('*, kpi_entries(*)').lte('start_date', now).gte('end_date', now),
      supabase.from('point_transactions').select('user_id, points'),
    ])

    if (!users) { setLoading(false); return }

    const employeesWithData = users.map(u => {
      const activeObjective = (allObjectives || []).find(obj =>
        obj.assigned_to === u.id || obj.assigned_to === 'team'
      ) || null

      let progress = 0
      if (activeObjective) {
        const userEntries = (activeObjective.kpi_entries || []).filter(e => e.user_id === u.id)
        const totalValue = userEntries.reduce((sum, e) => sum + e.value, 0)
        progress = activeObjective.target_value > 0
          ? Math.min((totalValue / activeObjective.target_value) * 100, 100)
          : 0
      }

      const totalPoints = (allPointTx || [])
        .filter(t => t.user_id === u.id)
        .reduce((sum, t) => sum + t.points, 0)

      return { ...u, activeObjective, totalPoints, progress }
    })

    const stats = {
      total: users.length,
      activeObjectives: employeesWithData.filter(e => e.activeObjective).length,
      totalPoints: employeesWithData.reduce((sum, e) => sum + e.totalPoints, 0),
    }

    cache.set('admin:dashboard', { employees: employeesWithData, stats })
    setEmployees(employeesWithData)
    setStats(stats)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard General</h1>
        <p className="text-dark-400 mt-1">Visión general del rendimiento del equipo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Empleados activos" value={stats.total} icon="👥" color="brand" />
        <StatCard title="Con objetivo activo" value={stats.activeObjectives} icon="🎯" color="emerald" />
        <StatCard title="Puntos totales equipo" value={stats.totalPoints.toLocaleString()} icon="⚡" color="amber" />
      </div>

      {/* Employee table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Rendimiento del equipo</h2>
        {employees.length === 0 ? (
          <div className="text-center py-10 text-dark-400">
            <p className="text-3xl mb-3">👥</p>
            <p>No hay empleados registrados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr>
                  <th className="table-header text-left pb-3">Empleado</th>
                  <th className="table-header text-left pb-3">Objetivo activo</th>
                  <th className="table-header text-left pb-3 min-w-[160px]">Progreso</th>
                  <th className="table-header text-right pb-3">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    className="table-row cursor-pointer hover:bg-brand-600/5 transition-colors"
                    onClick={() => navigate(`/admin/employee/${emp.id}`)}
                    title={`Ver perfil de ${emp.name}`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600/20 border border-brand-600/30 rounded-full flex items-center justify-center text-sm font-bold text-brand-400">
                          {emp.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{emp.name}</p>
                          <p className="text-dark-400 text-xs">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {emp.activeObjective ? (
                        <span className="text-sm text-white">{emp.activeObjective.title}</span>
                      ) : (
                        <span className="badge bg-dark-700 text-dark-400">Sin objetivo</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {emp.activeObjective ? (
                        <ProgressBar
                          value={emp.progress}
                          max={100}
                          showLabel={false}
                          size="sm"
                          color={emp.progress >= 100 ? 'emerald' : 'brand'}
                        />
                      ) : (
                        <span className="text-dark-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ⚡ {emp.totalPoints.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
