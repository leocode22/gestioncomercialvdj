import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import ConfettiCelebration from '../../components/ConfettiCelebration'
import ProgressBar from '../../components/ProgressBar'

export default function EmployeeKPI() {
  const { profile, refreshProfile } = useAuth()
  const [objectives, setObjectives] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [entries, setEntries] = useState({})
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  async function fetchData() {
    setLoading(true)
    const now = new Date().toISOString().split('T')[0]

    const [{ data: objs }, { data: hist }] = await Promise.all([
      supabase
        .from('objectives')
        .select('*, kpi_entries(*)')
        .or(`assigned_to.eq.${profile.id},assigned_to.eq.team`)
        .lte('start_date', now)
        .gte('end_date', now),
      supabase
        .from('kpi_entries')
        .select('*, objectives(title, kpi_type)')
        .eq('user_id', profile.id)
        .order('date', { ascending: false })
        .limit(30),
    ])

    const objectivesWithProgress = (objs || []).map(obj => {
      const myEntries = (obj.kpi_entries || []).filter(e => e.user_id === profile.id)
      const totalValue = myEntries.reduce((sum, e) => sum + e.value, 0)
      const pct = obj.target_value > 0 ? (totalValue / obj.target_value) * 100 : 0
      return { ...obj, currentValue: totalValue, progressPct: pct }
    })

    setObjectives(objectivesWithProgress)
    setHistory(hist || [])
    setLoading(false)
  }

  async function handleSubmit(objective) {
    const value = Math.floor(Number(entries[objective.id]))
    if (!value || value <= 0) return

    setSubmitting(objective.id)
    const today = new Date().toISOString().split('T')[0]

    // Insert KPI entry
    const { error: entryError } = await supabase
      .from('kpi_entries')
      .insert([{
        user_id: profile.id,
        objective_id: objective.id,
        value,
        date: today,
      }])

    if (entryError) { setSubmitting(null); return }

    // Calculate new total
    const newTotal = objective.currentValue + value
    const prevPct = objective.progressPct
    const newPct = objective.target_value > 0 ? (newTotal / objective.target_value) * 100 : 0

    // Award points if objective is now completed (crossed 100%)
    if (newPct >= 100 && prevPct < 100) {
      // Get matching point rule
      const { data: rules } = await supabase
        .from('point_rules')
        .select('*')

      if (rules && rules.length > 0) {
        const matchingRule = rules.find(r =>
          r.action_name.toLowerCase().includes(objective.kpi_type.toLowerCase()) ||
          objective.kpi_type.toLowerCase().includes(r.action_name.toLowerCase())
        ) || rules[0]

        await supabase.from('point_transactions').insert([{
          user_id: profile.id,
          points: matchingRule.points_value,
          reason: `Objetivo superado: ${objective.title}`,
        }])
      }

      setShowCelebration(true)
    }

    setEntries(prev => ({ ...prev, [objective.id]: '' }))
    setSuccessMsg(`✅ KPI registrado: +${value}`)
    setTimeout(() => setSuccessMsg(''), 3000)

    await fetchData()
    setSubmitting(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
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
        <h1 className="text-2xl font-bold text-white">Registrar KPIs</h1>
        <p className="text-dark-400 mt-1">Introduce tus resultados de hoy</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-sm font-medium animate-slide-up">
          {successMsg}
        </div>
      )}

      {/* Active objectives to fill */}
      {objectives.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-white font-semibold">Sin objetivos activos</p>
          <p className="text-dark-400 text-sm mt-2">Cuando el admin te asigne objetivos, aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map(obj => (
            <div key={obj.id} className={`card ${obj.progressPct >= 100 ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-white font-semibold text-lg">{obj.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge bg-dark-700 text-dark-300 text-xs">{obj.kpi_type}</span>
                    <span className={`badge text-xs ${obj.period === 'monthly' ? 'bg-brand-500/10 text-brand-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {obj.period === 'monthly' ? '📅 Mensual' : '📆 Semanal'}
                    </span>
                  </div>
                </div>
                {obj.progressPct >= 100 && (
                  <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    🏆 ¡Objetivo superado!
                  </span>
                )}
              </div>

              <div className="mb-5">
                <ProgressBar
                  value={obj.currentValue}
                  max={obj.target_value}
                  color={obj.progressPct >= 100 ? 'emerald' : 'brand'}
                  size="lg"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label text-xs">Añadir valor de hoy</label>
                  <input
                    type="number"
                    value={entries[obj.id] || ''}
                    onChange={e => setEntries(prev => ({ ...prev, [obj.id]: e.target.value }))}
                    onKeyDown={e => (e.key === '.' || e.key === ',') && e.preventDefault()}
                    className="input"
                    placeholder={`ej: 3 ${obj.kpi_type}`}
                    min="0"
                    step="1"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => handleSubmit(obj)}
                    disabled={submitting === obj.id || !entries[obj.id]}
                    className="btn-primary h-[42px] px-6 disabled:opacity-50"
                  >
                    {submitting === obj.id ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardando
                      </span>
                    ) : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Historial de entradas</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {history.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">{entry.objectives?.title || 'Objetivo'}</p>
                  <p className="text-dark-400 text-xs">{entry.objectives?.kpi_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-brand-400 font-bold">+{entry.value}</p>
                  <p className="text-dark-500 text-xs">{new Date(entry.date).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
