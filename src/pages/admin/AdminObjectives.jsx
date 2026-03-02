import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'
import EmptyState from '../../components/EmptyState'

const KPI_TYPES = ['Ventas cerradas', 'Llamadas realizadas', 'Demos agendadas', 'Ingresos generados', 'Follow-ups', 'Propuestas enviadas']
const PERIODS = [{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]

const emptyForm = {
  title: '',
  kpi_type: 'Ventas cerradas',
  target_value: '',
  period: 'monthly',
  start_date: '',
  end_date: '',
  assigned_to: 'team',
}

export default function AdminObjectives() {
  const [objectives, setObjectives] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingObj, setEditingObj] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: objs }, { data: emps }] = await Promise.all([
      supabase.from('objectives').select('*, users(name)').order('created_at', { ascending: false }),
      supabase.from('users').select('id, name').eq('role', 'employee').order('name'),
    ])
    setObjectives(objs || [])
    setEmployees(emps || [])
    setLoading(false)
  }

  function openCreate() {
    setEditingObj(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(obj) {
    setEditingObj(obj)
    setForm({
      title: obj.title,
      kpi_type: obj.kpi_type,
      target_value: obj.target_value,
      period: obj.period,
      start_date: obj.start_date,
      end_date: obj.end_date,
      assigned_to: obj.assigned_to,
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const payload = { ...form, target_value: Number(form.target_value) }

    let error
    if (editingObj) {
      ({ error } = await supabase.from('objectives').update(payload).eq('id', editingObj.id))
    } else {
      ({ error } = await supabase.from('objectives').insert([payload]))
    }

    if (!error) {
      setModalOpen(false)
      await fetchData()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('kpi_entries').delete().eq('objective_id', id)
    await supabase.from('objectives').delete().eq('id', id)
    setDeleteId(null)
    await fetchData()
  }

  const isActive = (obj) => {
    const now = new Date().toISOString().split('T')[0]
    return obj.start_date <= now && obj.end_date >= now
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Objetivos</h1>
          <p className="text-dark-400 mt-1">Gestiona los KPIs y metas del equipo</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <span>+</span> Nuevo objetivo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : objectives.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎯"
            title="Sin objetivos"
            description="Crea el primer objetivo para tu equipo"
            action={<button onClick={openCreate} className="btn-primary">Crear objetivo</button>}
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left pb-3">Título</th>
                <th className="table-header text-left pb-3">KPI</th>
                <th className="table-header text-left pb-3">Target</th>
                <th className="table-header text-left pb-3">Periodo</th>
                <th className="table-header text-left pb-3">Asignado a</th>
                <th className="table-header text-left pb-3">Estado</th>
                <th className="table-header text-right pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map(obj => (
                <tr key={obj.id} className="table-row">
                  <td className="py-3 pr-4">
                    <p className="text-white text-sm font-medium">{obj.title}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-dark-300 text-sm">{obj.kpi_type}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-white text-sm font-semibold">{obj.target_value.toLocaleString()}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${obj.period === 'monthly' ? 'bg-brand-500/10 text-brand-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {obj.period === 'monthly' ? '📅 Mensual' : '📆 Semanal'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-dark-300 text-sm">
                      {obj.assigned_to === 'team' ? '👥 Equipo' : (obj.users?.name || obj.assigned_to)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${isActive(obj) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>
                      {isActive(obj) ? '🟢 Activo' : '⚫ Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(obj)}
                        className="p-2 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteId(obj.id)}
                        className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingObj ? 'Editar objetivo' : 'Nuevo objetivo'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Título del objetivo</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="ej: Cerrar 10 ventas este mes"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de KPI</label>
              <select
                value={form.kpi_type}
                onChange={e => setForm(f => ({ ...f, kpi_type: e.target.value }))}
                className="input"
              >
                {KPI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Valor target</label>
              <input
                type="number"
                value={form.target_value}
                onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                className="input"
                placeholder="ej: 10"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Periodo</label>
              <select
                value={form.period}
                onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                className="input"
              >
                {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Asignar a</label>
              <select
                value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="input"
              >
                <option value="team">👥 Todo el equipo</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Fecha fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="input"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : (editingObj ? 'Actualizar' : 'Crear objetivo')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar eliminación" size="sm">
        <p className="text-dark-300 mb-6">¿Seguro que quieres eliminar este objetivo? También se eliminarán todas las entradas de KPI asociadas.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Eliminar</button>
        </div>
      </Modal>
    </div>
  )
}
