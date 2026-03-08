import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Read-only KPI viewer for admin use.
 * Props:
 *   - employeeId (string|null): the user ID whose data to load. If null, renders nothing.
 *   - showMonthSelector (bool, default true): show month/year selectors inside the component
 *   - defaultMonth (number, 1-12): optional initial month
 *   - defaultYear (number): optional initial year
 */
export default function KPIReadonlyViewer({ employeeId, showMonthSelector = true, defaultMonth, defaultYear }) {
  const now = new Date()
  const [month, setMonth] = useState(defaultMonth || now.getMonth() + 1)
  const [year, setYear] = useState(defaultYear || now.getFullYear())
  const [leads, setLeads] = useState([])
  const [financial, setFinancial] = useState({ cash_collected: 0, facturacion_generada: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (employeeId) fetchData()
  }, [employeeId, month, year])

  async function fetchData() {
    setLoading(true)
    const [leadsResult, finResult] = await Promise.all([
      supabase
        .from('kpi_lead_entries')
        .select('*')
        .eq('user_id', employeeId)
        .eq('month', month)
        .eq('year', year)
        .order('created_at', { ascending: true }),
      supabase
        .from('kpi_financial_entries')
        .select('*')
        .eq('user_id', employeeId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle(),
    ])

    setLeads(leadsResult.data || [])
    const fin = finResult.data
    setFinancial({
      cash_collected: fin?.cash_collected ?? 0,
      facturacion_generada: fin?.facturacion_generada ?? 0,
    })
    setLoading(false)
  }

  if (!employeeId) return null

  const totals = leads.reduce(
    (acc, l) => ({
      show: acc.show + (l.show ? 1 : 0),
      offer: acc.offer + (l.offer ? 1 : 0),
      decision_maker: acc.decision_maker + (l.decision_maker ? 1 : 0),
      budget: acc.budget + (l.budget ? 1 : 0),
      downsell: acc.downsell + (l.downsell ? 1 : 0),
      close_call: acc.close_call + (l.close_call ? 1 : 0),
      next_step: acc.next_step + (l.next_step ? 1 : 0),
      close_followup: acc.close_followup + (l.close_followup ? 1 : 0),
      days_show_to_offer:
        acc.days_show_to_offer + (l.days_show_to_offer !== null ? parseInt(l.days_show_to_offer) || 0 : 0),
      days_offer_to_close:
        acc.days_offer_to_close + (l.days_offer_to_close !== null ? parseInt(l.days_offer_to_close) || 0 : 0),
    }),
    {
      show: 0, offer: 0, decision_maker: 0, budget: 0, downsell: 0,
      close_call: 0, next_step: 0, close_followup: 0,
      days_show_to_offer: 0, days_offer_to_close: 0,
    }
  )

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="space-y-6">
      {showMonthSelector && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="input py-2 px-3 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="input py-2 px-3 text-sm"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Read-only leads table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 960 }}>
                <thead>
                  <tr className="border-b border-dark-700 bg-dark-800/50">
                    <th className="text-left py-3 px-3 text-dark-300 font-medium" style={{ minWidth: 160 }}>
                      Cliente Potencial
                    </th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium">Show</th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium">Offer</th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium text-xs leading-tight">
                      Decision<br />Maker
                    </th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium">Budget</th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium">Downsell</th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium text-xs leading-tight">
                      Close<br />llamada
                    </th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium text-xs leading-tight">
                      Next<br />Step
                    </th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium text-xs leading-tight">
                      Cierre en<br />Follow Up
                    </th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium text-xs leading-tight">
                      Días show<br />a oferta
                    </th>
                    <th className="text-center py-3 px-2 text-dark-300 font-medium text-xs leading-tight">
                      Días oferta<br />a cierre
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-dark-400 text-sm">
                        No hay leads registrados para este mes.
                      </td>
                    </tr>
                  )}
                  {leads.map((lead, idx) => (
                    <tr key={lead.id || idx} className="border-b border-dark-800 hover:bg-dark-800/20">
                      <td className="py-2 px-3 text-white text-sm">
                        {lead.lead_name || <span className="text-dark-500 italic">Sin nombre</span>}
                      </td>
                      {[
                        lead.show,
                        lead.offer,
                        lead.decision_maker,
                        lead.budget,
                        lead.downsell,
                        lead.close_call,
                        lead.next_step,
                        lead.close_followup,
                      ].map((val, i) => (
                        <td key={i} className="py-2 px-2 text-center">
                          <span className={`inline-block w-4 h-4 rounded-sm border ${val ? 'bg-brand-600 border-brand-600' : 'bg-dark-700 border-dark-600'}`}>
                            {val && <span className="text-white text-xs leading-none flex items-center justify-center h-full">✓</span>}
                          </span>
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center text-white text-sm">
                        {lead.days_show_to_offer ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-center text-white text-sm">
                        {lead.days_offer_to_close ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {leads.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-dark-600 bg-dark-800/60">
                      <td className="py-3 px-3 text-dark-300 font-semibold text-xs uppercase tracking-wide">
                        Suma:
                      </td>
                      {[
                        totals.show,
                        totals.offer,
                        totals.decision_maker,
                        totals.budget,
                        totals.downsell,
                        totals.close_call,
                        totals.next_step,
                        totals.close_followup,
                        totals.days_show_to_offer,
                        totals.days_offer_to_close,
                      ].map((val, i) => (
                        <td key={i} className="py-3 px-2 text-center font-bold text-white">
                          {val}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Financial summary (read-only) */}
          <div className="card">
            <h3 className="text-base font-semibold text-white mb-4">Resultados del Mes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                <p className="text-dark-400 text-xs mb-1">Cash Collected (€)</p>
                <p className="text-xl font-bold text-emerald-400">
                  €{(financial.cash_collected || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                <p className="text-dark-400 text-xs mb-1">Facturación Generada (€)</p>
                <p className="text-xl font-bold text-emerald-400">
                  €{(financial.facturacion_generada || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <PerformanceSummary totals={totals} leads={leads} cashCollected={financial.cash_collected || 0} />
        </>
      )}
    </div>
  )
}

function PerformanceSummary({ totals, leads, cashCollected }) {
  const cierres = totals.close_call + totals.close_followup
  const shows = totals.show
  const ofertas = totals.offer

  const leadsWithSalesCycle = leads.filter(
    l => l.days_offer_to_close !== null && l.days_offer_to_close !== undefined && l.days_offer_to_close !== ''
  )
  const avgSalesCycle =
    leadsWithSalesCycle.length > 0
      ? leadsWithSalesCycle.reduce((acc, l) => acc + (parseInt(l.days_offer_to_close) || 0), 0) /
        leadsWithSalesCycle.length
      : null

  const pct = (num, den) => (den === 0 ? null : (num / den) * 100)
  const div = (num, den) => (den === 0 ? null : num / den)

  const fmtPct = val => (val === null ? '—' : val.toFixed(2) + '%')
  const fmtNum = val => (val === null ? '—' : val.toFixed(2))
  const fmtEur = val => (val === null ? '—' : '€' + val.toFixed(2))

  const metrics = [
    { label: 'Número de Shows', value: shows.toString(), color: 'blue' },
    { label: 'Número de Ofertas Presentadas', value: ofertas.toString(), color: 'blue' },
    { label: 'Número de Cierres', value: cierres.toString(), color: 'emerald' },
    { label: 'Offer to Close %', value: fmtPct(pct(cierres, ofertas)), color: 'emerald' },
    { label: 'Show to Close %', value: fmtPct(pct(cierres, shows)), color: 'emerald' },
    { label: 'Closed on First Call %', value: fmtPct(pct(totals.close_call, ofertas)), color: 'amber' },
    { label: 'Average Downsell %', value: fmtPct(pct(totals.downsell, cierres)), color: 'red' },
    { label: 'Average Deal Size', value: fmtEur(div(cashCollected, cierres)), color: 'purple' },
    { label: 'Decision Maker Rate %', value: fmtPct(pct(totals.decision_maker, shows)), color: 'blue' },
    { label: 'Budget Qualification Rate %', value: fmtPct(pct(totals.budget, ofertas)), color: 'blue' },
    { label: 'MAP Confirmation Rate %', value: fmtPct(pct(totals.next_step, ofertas)), color: 'amber' },
    { label: 'Sales Cycle (días)', value: fmtNum(avgSalesCycle), color: 'purple' },
    { label: 'Revenue per Show', value: fmtEur(div(cashCollected, shows)), color: 'emerald' },
    { label: 'Revenue per Offer', value: fmtEur(div(cashCollected, ofertas)), color: 'emerald' },
    { label: 'Revenue Mensual (comisión 10%)', value: fmtEur(cashCollected * 0.1), color: 'brand' },
  ]

  const colorMap = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    brand: 'text-brand-400',
  }

  return (
    <div className="card">
      <h3 className="text-base font-semibold text-white mb-4">Resumen Performance</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {metrics.map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-dark-800 rounded-xl p-4 flex flex-col gap-1 border border-dark-700"
          >
            <span className="text-dark-400 text-xs leading-snug">{label}</span>
            <span className={`text-xl font-bold mt-1 ${colorMap[color]}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
