import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MEDAL_COLORS = [
  'bg-amber-500 text-amber-900',
  'bg-slate-400 text-slate-900',
  'bg-amber-700 text-amber-100',
]

const PERIOD_LABELS = { week: 'Esta semana', month: 'Este mes', all: 'Todo el tiempo' }

export default function AdminLeaderboard() {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')

  useEffect(() => { fetchRanking() }, [period])

  async function fetchRanking() {
    setLoading(true)

    let query = supabase
      .from('point_transactions')
      .select('user_id, points, users(id, name, email)')

    if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('created_at', weekAgo.toISOString())
    } else if (period === 'month') {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      query = query.gte('created_at', monthStart.toISOString())
    }

    const { data } = await query

    if (!data) { setLoading(false); return }

    // Aggregate by user
    const byUser = {}
    data.forEach(tx => {
      if (!tx.users) return
      const uid = tx.user_id
      if (!byUser[uid]) byUser[uid] = { ...tx.users, totalPoints: 0, txCount: 0 }
      byUser[uid].totalPoints += tx.points
      byUser[uid].txCount += 1
    })

    // Sort by points
    const sorted = Object.values(byUser).sort((a, b) => b.totalPoints - a.totalPoints)
    setRanking(sorted)
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ranking del equipo</h1>
          <p className="text-dark-400 mt-1">Los mejores en puntos</p>
        </div>
        <div className="flex bg-dark-800 rounded-xl p-1 gap-1">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === key ? 'bg-brand-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ranking.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-white font-semibold text-lg">Sin datos aún</p>
          <p className="text-dark-400 mt-2 text-sm">Nadie ha acumulado puntos en este periodo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 podium */}
          {ranking.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 0, 2].map(idx => {
                const user = ranking[idx]
                if (!user) return <div key={idx} />
                const positions = [1, 0, 2]
                const position = idx + 1
                const isFirst = idx === 0

                return (
                  <div
                    key={user.id}
                    className={`card text-center relative flex flex-col items-center ${
                      isFirst ? 'border-amber-500/30 bg-amber-500/5 pt-8' : 'pt-6'
                    }`}
                    style={{ order: idx === 0 ? -1 : idx }}
                  >
                    {isFirst && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-3xl">👑</div>
                    )}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-3 ${
                      MEDAL_COLORS[idx] || 'bg-dark-700 text-white'
                    }`}>
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div className={`badge mb-2 ${MEDAL_COLORS[idx] || 'bg-dark-700 text-white'} font-bold`}>
                      #{idx + 1}
                    </div>
                    <p className="text-white font-semibold text-sm">{user.name}</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{user.totalPoints.toLocaleString()}</p>
                    <p className="text-dark-400 text-xs">puntos</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full table */}
          <div className="card">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left pb-3 w-12">Pos.</th>
                  <th className="table-header text-left pb-3">Empleado</th>
                  <th className="table-header text-center pb-3">Transacciones</th>
                  <th className="table-header text-right pb-3">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((user, i) => (
                  <tr key={user.id} className={`table-row ${i < 3 ? 'font-semibold' : ''}`}>
                    <td className="py-3 pr-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-amber-500 text-amber-900' :
                        i === 1 ? 'bg-slate-400 text-slate-900' :
                        i === 2 ? 'bg-amber-700 text-amber-100' :
                        'bg-dark-700 text-dark-300'
                      }`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                          i < 3 ? 'bg-brand-600 text-white' : 'bg-dark-700 text-dark-300'
                        }`}>
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm">{user.name}</p>
                          <p className="text-dark-400 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-dark-400 text-sm">{user.txCount}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`font-bold text-lg ${i < 3 ? 'text-amber-400' : 'text-white'}`}>
                        {user.totalPoints.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
