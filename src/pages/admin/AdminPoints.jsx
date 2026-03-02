import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'
import EmptyState from '../../components/EmptyState'

const emptyForm = { action_name: '', points_value: '' }

export default function AdminPoints() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { fetchRules() }, [])

  async function fetchRules() {
    setLoading(true)
    const { data } = await supabase
      .from('point_rules')
      .select('*')
      .order('points_value', { ascending: false })
    setRules(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditingRule(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(rule) {
    setEditingRule(rule)
    setForm({ action_name: rule.action_name, points_value: rule.points_value })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, points_value: Number(form.points_value) }

    let error
    if (editingRule) {
      ({ error } = await supabase.from('point_rules').update(payload).eq('id', editingRule.id))
    } else {
      ({ error } = await supabase.from('point_rules').insert([payload]))
    }

    if (!error) { setModalOpen(false); await fetchRules() }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('point_rules').delete().eq('id', id)
    setDeleteId(null)
    await fetchRules()
  }

  const getPointsColor = (pts) => {
    if (pts >= 200) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    if (pts >= 100) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    return 'text-brand-400 bg-brand-500/10 border-brand-500/20'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reglas de puntos</h1>
          <p className="text-dark-400 mt-1">Define cuántos puntos vale cada acción</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <span>+</span> Nueva regla
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="⚡"
            title="Sin reglas de puntos"
            description="Crea las primeras reglas para recompensar al equipo automáticamente"
            action={<button onClick={openCreate} className="btn-primary">Crear regla</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(rule => (
            <div key={rule.id} className="card hover:border-dark-600 transition-all group relative">
              <div className="flex items-start justify-between mb-3">
                <div className={`badge border ${getPointsColor(rule.points_value)} text-sm font-bold`}>
                  ⚡ {rule.points_value} pts
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(rule)}
                    className="p-1.5 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteId(rule.id)}
                    className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className="text-white font-semibold">{rule.action_name}</p>
              <p className="text-dark-400 text-xs mt-1">
                Creada el {new Date(rule.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Example suggestions */}
      {rules.length === 0 && (
        <div className="card border-dashed border-dark-600">
          <p className="text-dark-400 text-sm font-medium mb-3">💡 Ejemplos de reglas:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Cerrar un deal', 100],
              ['Agendar una demo', 25],
              ['Hacer 10 llamadas', 10],
              ['Enviar propuesta', 15],
              ['Follow-up completado', 5],
              ['Superar target mensual', 200],
            ].map(([name, pts]) => (
              <button
                key={name}
                onClick={() => { setForm({ action_name: name, points_value: pts }); setModalOpen(true) }}
                className="text-left p-3 bg-dark-900 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <span className="text-xs text-brand-400 font-bold">+{pts} pts</span>
                <p className="text-white text-sm mt-0.5">{name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? 'Editar regla' : 'Nueva regla de puntos'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nombre de la acción</label>
            <input
              type="text"
              value={form.action_name}
              onChange={e => setForm(f => ({ ...f, action_name: e.target.value }))}
              className="input"
              placeholder="ej: Cerrar un deal"
              required
            />
          </div>
          <div>
            <label className="label">Puntos que vale</label>
            <input
              type="number"
              value={form.points_value}
              onChange={e => setForm(f => ({ ...f, points_value: e.target.value }))}
              className="input"
              placeholder="ej: 100"
              min="1"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : (editingRule ? 'Actualizar' : 'Crear regla')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar regla" size="sm">
        <p className="text-dark-300 mb-6">¿Eliminar esta regla de puntos?</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Eliminar</button>
        </div>
      </Modal>
    </div>
  )
}
