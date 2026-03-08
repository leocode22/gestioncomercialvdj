import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import KPIReadonlyViewer from '../../components/KPIReadonlyViewer'

export default function AdminKPIs() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  useEffect(() => {
    fetchEmployees()
  }, [])

  async function fetchEmployees() {
    setLoadingEmployees(true)
    const { data } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'employee')
      .order('name')
    setEmployees(data || [])
    setLoadingEmployees(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">KPIs del Equipo</h1>
        <p className="text-dark-400 mt-1">Vista de solo lectura de los KPIs de cada empleado</p>
      </div>

      {/* Selectors */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Seleccionar empleado y período</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            {loadingEmployees ? (
              <div className="input flex items-center gap-2 text-dark-400 text-sm">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Cargando empleados...
              </div>
            ) : (
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="input w-full"
              >
                <option value="">— Selecciona un empleado —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* KPI Viewer */}
      {selectedEmployeeId ? (
        <KPIReadonlyViewer
          key={selectedEmployeeId}
          employeeId={selectedEmployeeId}
          showMonthSelector
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-dark-400">Selecciona un empleado para ver sus KPIs</p>
        </div>
      )}
    </div>
  )
}
