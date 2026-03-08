import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ProgressBar from '../../components/ProgressBar'
import KPIReadonlyViewer from '../../components/KPIReadonlyViewer'

export default function AdminEmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState(null)
  const [objectives, setObjectives] = useState([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const now = new Date().toISOString().split('T')[0]

    const [
      { data: user },
      { data: allObjectives },
      { data: pointTx },
      { data: redemptionData },
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', id).single(),
      supabase
        .from('objectives')
        .select('*, kpi_entries(*)')
        .lte('start_date', now)
        .gte('end_date', now),
      supabase.from('point_transactions').select('points').eq('user_id', id),
      supabase
        .from('reward_redemptions')
        .select('*, rewards(name, points_cost)')
        .eq('user_id', id)
        .order('redeemed_at', { ascending: false }),
    ])

    if (!user) {
      setLoading(false)
      return
    }

    // Filter objectives assigned to this user or team
    const userObjectives = (allObjectives || [])
      .filter(obj => obj.assigned_to === id || obj.assigned_to === 'team')
      .map(obj => {
        const userEntries = (obj.kpi_entries || []).filter(e => e.user_id === id)
        const totalValue = userEntries.reduce((sum, e) => sum + e.value, 0)
        const progress =
          obj.target_value > 0 ? Math.min((totalValue / obj.target_value) * 100, 100) : 0
        return { ...obj, progress, currentValue: totalValue }
      })

    const pts = (pointTx || []).reduce((sum, t) => sum + t.points, 0)

    setEmployee(user)
    setObjectives(userObjectives)
    setTotalPoints(pts)
    setRedemptions(redemptionData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <p className="text-3xl mb-3">❓</p>
        <p className="text-dark-400">Empleado no encontrado</p>
        <button onClick={() => navigate('/admin')} className="btn-secondary mt-4 text-sm">
          Volver al Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button + header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm mt-1"
        >
          <span>←</span> Volver
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{employee.name}</h1>
          <p className="text-dark-400 mt-1">Perfil del empleado</p>
        </div>
      </div>

      {/* Employee info card */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Información del empleado</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 bg-brand-600/20 border border-brand-600/30 rounded-full flex items-center justify-center text-2xl font-bold text-brand-400 flex-shrink-0">
            {employee.name[0]?.toUpperCase()}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-white font-semibold text-lg truncate">{employee.name}</p>
            <p className="text-dark-400 text-sm truncate">{employee.email}</p>
            <span className="badge bg-brand-600/20 text-brand-400 border border-brand-600/30 text-xs capitalize">
              {employee.role}
            </span>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto">
            <div className="sm:text-right">
              <p className="text-dark-400 text-xs mb-1">Puntos acumulados</p>
              <p className="text-2xl font-bold text-amber-400">⚡ {totalPoints.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active objectives */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Objetivos activos</h2>
        {objectives.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🎯</p>
            <p className="text-dark-400 text-sm">Sin objetivos activos actualmente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {objectives.map(obj => (
              <div key={obj.id} className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-white font-medium">{obj.title}</p>
                    <p className="text-dark-400 text-xs mt-0.5">{obj.kpi_type} · {obj.period === 'monthly' ? 'Mensual' : 'Semanal'}</p>
                  </div>
                  {obj.progress >= 100 && (
                    <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs shrink-0">
                      ✅ Completado
                    </span>
                  )}
                </div>
                <ProgressBar
                  value={obj.currentValue}
                  max={obj.target_value}
                  showLabel
                  size="sm"
                  color={obj.progress >= 100 ? 'emerald' : 'brand'}
                />
                <div className="flex justify-between mt-2 text-xs text-dark-500">
                  <span>{obj.start_date} → {obj.end_date}</span>
                  <span>{obj.currentValue} / {obj.target_value}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reward redemption history */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Historial de recompensas canjeadas</h2>
        {redemptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🎁</p>
            <p className="text-dark-400 text-sm">Ninguna recompensa canjeada todavía</p>
          </div>
        ) : (
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎁</span>
                  <div>
                    <p className="text-white text-sm font-medium">{r.rewards?.name || 'Recompensa eliminada'}</p>
                    <p className="text-dark-500 text-xs">
                      {new Date(r.redeemed_at).toLocaleDateString('es-ES', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
                  ⚡ {r.rewards?.points_cost?.toLocaleString() || '—'} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPIs section */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">KPIs</h2>
        <p className="text-dark-400 text-sm mb-4">Selecciona el mes y año para ver los KPIs del empleado.</p>
        <KPIReadonlyViewer employeeId={id} showMonthSelector />
      </div>
    </div>
  )
}
