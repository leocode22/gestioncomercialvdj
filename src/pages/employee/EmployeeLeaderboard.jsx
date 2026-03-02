import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const MEDALS = ['🥇', '🥈', '🥉']

export default function EmployeeLeaderboard() {
  const { profile } = useAuth()
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState(null)

  useEffect(() => { fetchRanking() }, [])

  async function fetchRanking() {
    setLoading(true)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('point_transactions')
      .select('user_id, points, users(id, name, email)')
      .gte('created_at', monthStart.toISOString())

    if (!data) { setLoading(false); return }

    const byUser = {}
    data.forEach(tx => {
      if (!tx.users) return
      const uid = tx.user_id
      if (!byUser[uid]) byUser[uid] = { ...tx.users, totalPoints: 0 }
      byUser[uid].totalPoints += tx.points
    })

    const sorted = Object.values(byUser).sort((a, b) => b.totalPoints - a.totalPoints)
    setRanking(sorted)

    const myPosition = sorted.findIndex(u => u.id === profile?.id)
    setMyRank(myPosition >= 0 ? myPosition + 1 : null)

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const myRankData = ranking.find(u => u.id === profile?.id)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Ranking del equipo</h1>
        <p className="text-dark-400 mt-1">Puntos acumulados este mes</p>
      </div>

      {/* My position banner */}
      {myRank && myRankData && (
        <div className={`card border-2 ${
          myRank === 1 ? 'border-amber-500/50 bg-amber-500/5' :
          myRank === 2 ? 'border-slate-400/50 bg-slate-500/5' :
          myRank === 3 ? 'border-amber-700/50 bg-amber-700/5' :
          'border-brand-500/30 bg-brand-500/5'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg ${
              myRank === 1 ? 'bg-amber-500 text-amber-900 shadow-amber-500/30' :
              myRank === 2 ? 'bg-slate-400 text-slate-900 shadow-slate-400/30' :
              myRank === 3 ? 'bg-amber-700 text-amber-100 shadow-amber-700/30' :
              'bg-brand-600 text-white shadow-brand-600/30'
            }`}>
              {myRank <= 3 ? MEDALS[myRank - 1] : `#${myRank}`}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">Tu posición este mes</p>
              <p className="text-dark-400 text-sm">
                {myRank === 1 ? '¡Eres el número 1! 🔥 Sigue así' :
                 myRank <= 3 ? '¡Estás en el podio! 💪 A por el oro' :
                 `Posición #${myRank}. ¡A por los primeros puestos!`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-400">{myRankData.totalPoints.toLocaleString()}</p>
              <p className="text-dark-400 text-xs">puntos</p>
            </div>
          </div>
        </div>
      )}

      {ranking.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-white font-semibold">Sin datos este mes</p>
          <p className="text-dark-400 text-sm mt-2">¡Sé el primero en acumular puntos!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranking.map((user, i) => {
            const isMe = user.id === profile?.id
            const position = i + 1

            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isMe ? 'border-brand-500/40 bg-brand-500/10' :
                  position <= 3 ? 'card hover:border-dark-600' : 'card hover:border-dark-600'
                }`}
              >
                {/* Position */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                  position === 1 ? 'bg-amber-500 text-amber-900' :
                  position === 2 ? 'bg-slate-400 text-slate-900' :
                  position === 3 ? 'bg-amber-700 text-amber-100' :
                  'bg-dark-700 text-dark-300'
                }`}>
                  {position <= 3 ? MEDALS[position - 1] : position}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isMe ? 'bg-brand-600 text-white ring-2 ring-brand-400' :
                  'bg-dark-700 text-dark-300'
                }`}>
                  {user.name?.[0]?.toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
                    {user.name}
                    {isMe && <span className="text-brand-400 ml-2 text-xs">(tú)</span>}
                  </p>
                  {position === 1 && (
                    <p className="text-amber-400 text-xs font-medium">👑 Líder del mes</p>
                  )}
                </div>

                {/* Points bar */}
                <div className="flex-1 max-w-[120px] hidden sm:block">
                  <div className="progress-bar h-1.5">
                    <div
                      className={`progress-fill ${
                        position <= 3 ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{
                        width: `${ranking[0]?.totalPoints > 0
                          ? (user.totalPoints / ranking[0].totalPoints) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-lg ${
                    position <= 3 ? 'text-amber-400' : isMe ? 'text-brand-400' : 'text-white'
                  }`}>
                    {user.totalPoints.toLocaleString()}
                  </p>
                  <p className="text-dark-400 text-xs">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
