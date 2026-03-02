import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import ProgressBar from '../../components/ProgressBar'
import StatCard from '../../components/StatCard'
import ConfettiCelebration from '../../components/ConfettiCelebration'

export default function EmployeeDashboard() {
  const { profile } = useAuth()
  const [objectives, setObjectives] = useState([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [completedObjectives, setCompletedObjectives] = useState([])

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  async function fetchData() {
    setLoading(true)
    const now = new Date().toISOString().split('T')[0]

    const [{ data: objs }, { data: pointTx }, { data: rewardsData }] = await Promise.all([
      supabase
        .from('objectives')
        .select('*, kpi_entries(*)')
        .or(`assigned_to.eq.${profile.id},assigned_to.eq.team`)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false }),
      supabase
        .from('point_transactions')
        .select('points')
        .eq('user_id', profile.id),
      supabase
        .from('rewards')
        .select('*')
        .order('points_cost'),
    ])

    const pts = (pointTx || []).reduce((sum, t) => sum + t.points, 0)
    setTotalPoints(pts)
    setRewards(rewardsData || [])

    const objectivesWithProgress = (objs || []).map(obj => {
      const myEntries = (obj.kpi_entries || []).filter(e => e.user_id === profile.id)
      const totalValue = myEntries.reduce((sum, e) => sum + e.value, 0)
      const pct = obj.target_value > 0 ? (totalValue / obj.target_value) * 100 : 0
      return { ...obj, currentValue: totalValue, progressPct: pct }
    })

    setObjectives(objectivesWithProgress)

    // Check if any objectives are newly completed (>= 100%)
    const completed = objectivesWithProgress.filter(o => o.progressPct >= 100)
    if (completed.length > 0 && completedObjectives.length === 0 && !loading) {
      setShowCelebration(true)
    }
    setCompletedObjectives(completed.map(o => o.id))
    setLoading(false)
  }

  const nextReward = rewards
    .filter(r => r.points_cost > totalPoints)
    .sort((a, b) => a.points_cost - b.points_cost)[0]

  const ptsDiff = nextReward ? nextReward.points_cost - totalPoints : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {showCelebration && (
        <ConfettiCelebration
          trigger={showCelebration}
          onComplete={() => setShowCelebration(false)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {profile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-dark-400 mt-1">Aquí está tu rendimiento actual</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Mis puntos totales"
          value={totalPoints.toLocaleString()}
          icon="⚡"
          color="amber"
          subtitle="Puntos acumulados"
        />
        <StatCard
          title="Objetivos activos"
          value={objectives.length}
          icon="🎯"
          color="brand"
        />
        <StatCard
          title="Objetivos superados"
          value={objectives.filter(o => o.progressPct >= 100).length}
          icon="✅"
          color="emerald"
        />
      </div>

      {/* Next reward teaser */}
      {nextReward && (
        <div className="card border-brand-500/20 bg-brand-500/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center text-2xl">
                🎁
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-0.5">Próxima recompensa</p>
                <p className="text-white font-semibold">{nextReward.name}</p>
                <p className="text-brand-400 text-sm">
                  Te faltan <span className="font-bold">{ptsDiff.toLocaleString()} pts</span>
                </p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <ProgressBar
                value={totalPoints}
                max={nextReward.points_cost}
                color="brand"
                size="md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Objectives */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Mis objetivos activos</h2>
        {objectives.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-white font-medium">Sin objetivos activos</p>
            <p className="text-dark-400 text-sm mt-2">El admin te asignará objetivos próximamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {objectives.map(obj => (
              <div key={obj.id} className={`card transition-all ${
                obj.progressPct >= 100 ? 'border-emerald-500/30 bg-emerald-500/5' : 'hover:border-dark-600'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{obj.title}</h3>
                    <p className="text-dark-400 text-xs mt-0.5">{obj.kpi_type}</p>
                  </div>
                  {obj.progressPct >= 100 && (
                    <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✅ Superado
                    </span>
                  )}
                </div>

                <ProgressBar
                  value={obj.currentValue}
                  max={obj.target_value}
                  color={obj.progressPct >= 100 ? 'emerald' : 'brand'}
                  size="lg"
                />

                <div className="flex items-center justify-between mt-3 text-xs text-dark-400">
                  <span>{new Date(obj.start_date).toLocaleDateString('es-ES')} — {new Date(obj.end_date).toLocaleDateString('es-ES')}</span>
                  <span className={`badge ${obj.period === 'monthly' ? 'bg-brand-500/10 text-brand-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {obj.period === 'monthly' ? 'Mensual' : 'Semanal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rewards preview */}
      {rewards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Catálogo de recompensas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {rewards.slice(0, 4).map(reward => {
              const canRedeem = totalPoints >= reward.points_cost
              return (
                <div key={reward.id} className={`card p-4 text-center ${canRedeem ? 'border-emerald-500/30' : ''}`}>
                  <p className="text-2xl mb-2">🎁</p>
                  <p className="text-white text-sm font-medium mb-1 line-clamp-1">{reward.name}</p>
                  <p className={`text-xs font-bold ${canRedeem ? 'text-emerald-400' : 'text-amber-400'}`}>
                    ⚡ {reward.points_cost.toLocaleString()} pts
                  </p>
                  {canRedeem && (
                    <span className="badge bg-emerald-500/10 text-emerald-400 text-xs mt-2">¡Canjeables!</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
