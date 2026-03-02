import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'
import EmptyState from '../../components/EmptyState'

const emptyForm = { name: '', description: '', points_cost: '' }

export default function AdminRewards() {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReward, setEditingReward] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { fetchRewards() }, [])

  async function fetchRewards() {
    setLoading(true)
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .order('points_cost', { ascending: true })
    setRewards(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditingReward(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(reward) {
    setEditingReward(reward)
    setForm({ name: reward.name, description: reward.description || '', points_cost: reward.points_cost })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, points_cost: Number(form.points_cost) }

    let error
    if (editingReward) {
      ({ error } = await supabase.from('rewards').update(payload).eq('id', editingReward.id))
    } else {
      ({ error } = await supabase.from('rewards').insert([payload]))
    }

    if (!error) { setModalOpen(false); await fetchRewards() }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('reward_redemptions').delete().eq('reward_id', id)
    await supabase.from('rewards').delete().eq('id', id)
    setDeleteId(null)
    await fetchRewards()
  }

  const rewardEmojis = ['🎁', '🏆', '🎮', '🎟️', '💰', '🍕', '🎯', '⭐', '💎', '🎵']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recompensas</h1>
          <p className="text-dark-400 mt-1">Catálogo de premios para el equipo</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <span>+</span> Nueva recompensa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rewards.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎁"
            title="Sin recompensas"
            description="Añade recompensas para motivar al equipo a acumular puntos"
            action={<button onClick={openCreate} className="btn-primary">Crear recompensa</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward, i) => (
            <div key={reward.id} className="card hover:border-dark-600 transition-all group relative flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center text-2xl">
                  {rewardEmojis[i % rewardEmojis.length]}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(reward)}
                    className="p-1.5 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteId(reward.id)}
                    className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <h3 className="text-white font-semibold text-lg mb-2">{reward.name}</h3>
              {reward.description && (
                <p className="text-dark-400 text-sm mb-4 flex-1">{reward.description}</p>
              )}

              <div className="mt-auto pt-4 border-t border-dark-700 flex items-center justify-between">
                <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-bold">
                  ⚡ {reward.points_cost.toLocaleString()} puntos
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingReward ? 'Editar recompensa' : 'Nueva recompensa'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nombre de la recompensa</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input"
              placeholder="ej: Día libre extra"
              required
            />
          </div>
          <div>
            <label className="label">Descripción <span className="text-dark-500">(opcional)</span></label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input resize-none"
              rows={3}
              placeholder="ej: Un día libre adicional para disfrutar como quieras"
            />
          </div>
          <div>
            <label className="label">Coste en puntos</label>
            <input
              type="number"
              value={form.points_cost}
              onChange={e => setForm(f => ({ ...f, points_cost: e.target.value }))}
              className="input"
              placeholder="ej: 500"
              min="1"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : (editingReward ? 'Actualizar' : 'Crear recompensa')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar recompensa" size="sm">
        <p className="text-dark-300 mb-6">¿Eliminar esta recompensa del catálogo?</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Eliminar</button>
        </div>
      </Modal>
    </div>
  )
}
