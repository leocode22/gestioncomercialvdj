import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'

const rewardEmojis = ['🎁', '🏆', '🎮', '🎟️', '💰', '🍕', '🎯', '⭐', '💎', '🎵']

export default function EmployeeRewards() {
  const { profile } = useAuth()
  const [rewards, setRewards] = useState([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [redeemingId, setRedeemingId] = useState(null)
  const [confirmReward, setConfirmReward] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  async function fetchData() {
    setLoading(true)
    const [{ data: rewardsData }, { data: pointTx }, { data: redemData }] = await Promise.all([
      supabase.from('rewards').select('*').order('points_cost'),
      supabase.from('point_transactions').select('points').eq('user_id', profile.id),
      supabase.from('reward_redemptions').select('*, rewards(name)').eq('user_id', profile.id).order('redeemed_at', { ascending: false }),
    ])

    setRewards(rewardsData || [])
    setTotalPoints((pointTx || []).reduce((sum, t) => sum + t.points, 0))
    setRedemptions(redemData || [])
    setLoading(false)
  }

  async function handleRedeem(reward) {
    if (totalPoints < reward.points_cost) return

    setRedeemingId(reward.id)
    setErrorMsg('')

    // Deduct points
    const { error: ptError } = await supabase.from('point_transactions').insert([{
      user_id: profile.id,
      points: -reward.points_cost,
      reason: `Canje de recompensa: ${reward.name}`,
    }])

    if (ptError) {
      setErrorMsg('Error al canjear. Inténtalo de nuevo.')
      setRedeemingId(null)
      setConfirmReward(null)
      return
    }

    // Register redemption
    await supabase.from('reward_redemptions').insert([{
      user_id: profile.id,
      reward_id: reward.id,
      redeemed_at: new Date().toISOString(),
    }])

    setSuccessMsg(`🎉 ¡Has canjeado: ${reward.name}!`)
    setTimeout(() => setSuccessMsg(''), 4000)
    setConfirmReward(null)
    setRedeemingId(null)
    await fetchData()
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Recompensas</h1>
          <p className="text-dark-400 mt-1">Canjea tus puntos por premios</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-xs text-dark-400">Mis puntos</p>
            <p className="text-2xl font-bold text-amber-400">{totalPoints.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-sm font-medium animate-slide-up">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {rewards.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🎁</p>
          <p className="text-white font-semibold">Sin recompensas disponibles</p>
          <p className="text-dark-400 text-sm mt-2">El admin añadirá recompensas próximamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward, i) => {
            const canRedeem = totalPoints >= reward.points_cost
            const pctToReward = Math.min((totalPoints / reward.points_cost) * 100, 100)

            return (
              <div
                key={reward.id}
                className={`card flex flex-col transition-all ${
                  canRedeem ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'hover:border-dark-600'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 ${
                  canRedeem ? 'bg-emerald-500/10' : 'bg-dark-700/50'
                }`}>
                  {rewardEmojis[i % rewardEmojis.length]}
                </div>

                <h3 className="text-white font-semibold text-lg mb-1">{reward.name}</h3>
                {reward.description && (
                  <p className="text-dark-400 text-sm mb-4 flex-1">{reward.description}</p>
                )}

                <div className="mt-auto">
                  {/* Progress to this reward */}
                  {!canRedeem && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-dark-400">{totalPoints.toLocaleString()} pts</span>
                        <span className="text-dark-400">{reward.points_cost.toLocaleString()} pts</span>
                      </div>
                      <div className="progress-bar h-1.5">
                        <div className="progress-fill bg-brand-500" style={{ width: `${pctToReward}%` }} />
                      </div>
                      <p className="text-xs text-dark-400 mt-1 text-right">
                        Faltan {(reward.points_cost - totalPoints).toLocaleString()} pts
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                    <span className={`badge font-bold text-sm ${
                      canRedeem
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      ⚡ {reward.points_cost.toLocaleString()}
                    </span>
                    <button
                      onClick={() => setConfirmReward(reward)}
                      disabled={!canRedeem}
                      className={`px-4 py-1.5 min-h-[44px] rounded-lg text-sm font-semibold transition-all ${
                        canRedeem
                          ? 'btn-success'
                          : 'bg-dark-700 text-dark-500 cursor-not-allowed'
                      }`}
                    >
                      {canRedeem ? '🎁 Canjear' : '🔒 Bloqueado'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Redemption history */}
      {redemptions.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Historial de canjes</h2>
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎁</span>
                  <div>
                    <p className="text-white text-sm font-medium">{r.rewards?.name}</p>
                    <p className="text-dark-400 text-xs">Canjeado el {new Date(r.redeemed_at).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
                <span className="badge bg-emerald-500/10 text-emerald-400 text-xs">✅ Canjeado</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <Modal
        isOpen={!!confirmReward}
        onClose={() => setConfirmReward(null)}
        title="Confirmar canje"
        size="sm"
      >
        {confirmReward && (
          <div>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎁</div>
              <p className="text-white font-semibold text-lg">{confirmReward.name}</p>
              {confirmReward.description && (
                <p className="text-dark-400 text-sm mt-2">{confirmReward.description}</p>
              )}
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 font-bold text-lg">⚡ {confirmReward.points_cost.toLocaleString()} puntos</p>
                <p className="text-dark-400 text-sm">
                  Te quedarán {(totalPoints - confirmReward.points_cost).toLocaleString()} pts
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReward(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRedeem(confirmReward)}
                disabled={redeemingId === confirmReward.id}
                className="btn-success flex-1"
              >
                {redeemingId === confirmReward.id ? 'Canjeando...' : '¡Canjear!'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
