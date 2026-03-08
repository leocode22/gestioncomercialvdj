import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function Checkbox({ checked, onChange, disabled }) {
  return (
    <td className="py-2 px-2 text-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        style={{ accentColor: '#6366f1', width: 16, height: 16 }}
        className={`cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      />
    </td>
  )
}

export default function EmployeeLeadTracker() {
  const { profile } = useAuth()
  const now = new Date()

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [leads, setLeads] = useState([])
  const [financial, setFinancial] = useState({ id: null, cash_collected: '', facturacion_generada: '' })
  const [loading, setLoading] = useState(true)
  const [addingLead, setAddingLead] = useState(false)
  const [savingFinancial, setSavingFinancial] = useState(false)

  // Refs to avoid stale closure issues in async callbacks
  const saveTimers = useRef({})
  const pendingLeads = useRef({})
  const financialRef = useRef({ id: null, cash_collected: '', facturacion_generada: '' })

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, month, year])

  async function fetchData() {
    setLoading(true)

    // Clear pending timers when switching months
    Object.values(saveTimers.current).forEach(t => clearTimeout(t))
    saveTimers.current = {}
    pendingLeads.current = {}

    const [leadsResult, finResult] = await Promise.all([
      supabase
        .from('kpi_lead_entries')
        .select('*')
        .eq('user_id', profile.id)
        .eq('month', month)
        .eq('year', year)
        .order('created_at', { ascending: true }),
      supabase
        .from('kpi_financial_entries')
        .select('*')
        .eq('user_id', profile.id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle(),
    ])

    const leadsData = (leadsResult.data || []).map(l => ({
      ...l,
      days_show_to_offer: l.days_show_to_offer ?? '',
      days_offer_to_close: l.days_offer_to_close ?? '',
      saving: false,
    }))

    const fin = finResult.data
    const financialState = {
      id: fin?.id || null,
      cash_collected: fin?.cash_collected ?? '',
      facturacion_generada: fin?.facturacion_generada ?? '',
    }

    leadsData.forEach((lead, i) => {
      pendingLeads.current[i] = lead
    })

    setLeads(leadsData)
    setFinancial(financialState)
    financialRef.current = financialState
    setLoading(false)
  }

  async function addLead() {
    setAddingLead(true)
    const { data, error } = await supabase
      .from('kpi_lead_entries')
      .insert([{
        user_id: profile.id,
        month,
        year,
        lead_name: '',
        show: false,
        offer: false,
        decision_maker: false,
        budget: false,
        downsell: false,
        close_call: false,
        next_step: false,
        close_followup: false,
        days_show_to_offer: null,
        days_offer_to_close: null,
      }])
      .select()
      .single()

    if (!error && data) {
      const newLead = { ...data, days_show_to_offer: '', days_offer_to_close: '', saving: false }
      setLeads(prev => {
        const updated = [...prev, newLead]
        pendingLeads.current[updated.length - 1] = newLead
        return updated
      })
    }
    setAddingLead(false)
  }

  function updateLeadLocal(index, field, value) {
    setLeads(prev => {
      const updated = [...prev]
      const lead = { ...updated[index], [field]: value }

      // Conditional logic: show=false disables everything else
      if (field === 'show' && !value) {
        lead.offer = false
        lead.decision_maker = false
        lead.budget = false
        lead.downsell = false
        lead.close_call = false
        lead.next_step = false
        lead.close_followup = false
        lead.days_show_to_offer = ''
        lead.days_offer_to_close = ''
      } else if (!lead.offer) {
        // offer=false disables close-related fields
        lead.close_call = false
        lead.next_step = false
        lead.close_followup = false
        lead.days_offer_to_close = ''
      }
      if (!lead.show) {
        lead.days_show_to_offer = ''
      }

      updated[index] = lead
      pendingLeads.current[index] = lead
      return updated
    })

    // Debounced autosave
    if (saveTimers.current[index]) clearTimeout(saveTimers.current[index])
    saveTimers.current[index] = setTimeout(() => saveLead(index), 700)
  }

  async function saveLead(index) {
    const lead = pendingLeads.current[index]
    if (!lead?.id) return

    setLeads(prev => {
      const updated = [...prev]
      if (updated[index]) updated[index] = { ...updated[index], saving: true }
      return updated
    })

    await supabase
      .from('kpi_lead_entries')
      .update({
        lead_name: lead.lead_name,
        show: lead.show,
        offer: lead.offer,
        decision_maker: lead.decision_maker,
        budget: lead.budget,
        downsell: lead.downsell,
        close_call: lead.close_call,
        next_step: lead.next_step,
        close_followup: lead.close_followup,
        days_show_to_offer: lead.days_show_to_offer !== '' ? parseInt(lead.days_show_to_offer) : null,
        days_offer_to_close: lead.days_offer_to_close !== '' ? parseInt(lead.days_offer_to_close) : null,
      })
      .eq('id', lead.id)

    setLeads(prev => {
      const updated = [...prev]
      if (updated[index]) updated[index] = { ...updated[index], saving: false }
      return updated
    })
  }

  function handleFinancialChange(field, value) {
    financialRef.current = { ...financialRef.current, [field]: value }
    setFinancial(prev => ({ ...prev, [field]: value }))
  }

  async function saveFinancial() {
    setSavingFinancial(true)
    const { id, cash_collected, facturacion_generada } = financialRef.current
    const payload = {
      cash_collected: cash_collected !== '' ? parseFloat(cash_collected) : null,
      facturacion_generada: facturacion_generada !== '' ? parseFloat(facturacion_generada) : null,
    }

    if (id) {
      await supabase.from('kpi_financial_entries').update(payload).eq('id', id)
    } else {
      const { data } = await supabase
        .from('kpi_financial_entries')
        .insert([{ user_id: profile.id, month, year, ...payload }])
        .select()
        .single()
      if (data) {
        financialRef.current = { ...financialRef.current, id: data.id }
        setFinancial(prev => ({ ...prev, id: data.id }))
      }
    }
    setSavingFinancial(false)
  }

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
        acc.days_show_to_offer +
        (l.days_show_to_offer !== '' && l.days_show_to_offer !== null
          ? parseInt(l.days_show_to_offer) || 0
          : 0),
      days_offer_to_close:
        acc.days_offer_to_close +
        (l.days_offer_to_close !== '' && l.days_offer_to_close !== null
          ? parseInt(l.days_offer_to_close) || 0
          : 0),
    }),
    {
      show: 0, offer: 0, decision_maker: 0, budget: 0, downsell: 0,
      close_call: 0, next_step: 0, close_followup: 0,
      days_show_to_offer: 0, days_offer_to_close: 0,
    }
  )

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + month/year selector */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis KPIs</h1>
          <p className="text-dark-400 mt-1">Tracker de leads mensual</p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Leads table */}
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
                    No hay leads este mes. Pulsa "+ Añadir Lead" para empezar.
                  </td>
                </tr>
              )}
              {leads.map((lead, idx) => {
                const showDisabled = !lead.show
                const offerDepDisabled = !lead.offer

                return (
                  <tr
                    key={lead.id || idx}
                    className={`border-b border-dark-800 transition-opacity ${lead.saving ? 'opacity-60' : 'hover:bg-dark-800/20'}`}
                  >
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={lead.lead_name}
                        onChange={e => updateLeadLocal(idx, 'lead_name', e.target.value)}
                        className="input py-1.5 text-sm w-full"
                        placeholder="Nombre del lead"
                      />
                    </td>

                    {/* Show */}
                    <Checkbox
                      checked={lead.show}
                      onChange={v => updateLeadLocal(idx, 'show', v)}
                    />
                    {/* Offer */}
                    <Checkbox
                      checked={lead.offer}
                      onChange={v => updateLeadLocal(idx, 'offer', v)}
                      disabled={showDisabled}
                    />
                    {/* Decision Maker */}
                    <Checkbox
                      checked={lead.decision_maker}
                      onChange={v => updateLeadLocal(idx, 'decision_maker', v)}
                      disabled={showDisabled}
                    />
                    {/* Budget */}
                    <Checkbox
                      checked={lead.budget}
                      onChange={v => updateLeadLocal(idx, 'budget', v)}
                      disabled={showDisabled}
                    />
                    {/* Downsell */}
                    <Checkbox
                      checked={lead.downsell}
                      onChange={v => updateLeadLocal(idx, 'downsell', v)}
                      disabled={showDisabled}
                    />
                    {/* Close llamada */}
                    <Checkbox
                      checked={lead.close_call}
                      onChange={v => updateLeadLocal(idx, 'close_call', v)}
                      disabled={offerDepDisabled}
                    />
                    {/* Next Step */}
                    <Checkbox
                      checked={lead.next_step}
                      onChange={v => updateLeadLocal(idx, 'next_step', v)}
                      disabled={offerDepDisabled}
                    />
                    {/* Cierre en Follow Up */}
                    <Checkbox
                      checked={lead.close_followup}
                      onChange={v => updateLeadLocal(idx, 'close_followup', v)}
                      disabled={offerDepDisabled}
                    />

                    {/* Días show a oferta */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        value={lead.days_show_to_offer}
                        onChange={e => updateLeadLocal(idx, 'days_show_to_offer', e.target.value)}
                        disabled={showDisabled}
                        className={`input py-1.5 text-sm text-center ${showDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={{ width: 60 }}
                        min="0"
                        placeholder="-"
                      />
                    </td>

                    {/* Días oferta a cierre */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        value={lead.days_offer_to_close}
                        onChange={e => updateLeadLocal(idx, 'days_offer_to_close', e.target.value)}
                        disabled={offerDepDisabled}
                        className={`input py-1.5 text-sm text-center ${offerDepDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={{ width: 60 }}
                        min="0"
                        placeholder="-"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Totals row */}
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

        {/* Add lead button */}
        <div className="p-4 border-t border-dark-800">
          <button
            onClick={addLead}
            disabled={addingLead}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {addingLead ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-base leading-none font-bold">+</span>
            )}
            Añadir Lead
          </button>
        </div>
      </div>

      {/* Financial section */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Resultados del Mes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Cash Collected (€)</label>
            <input
              type="number"
              value={financial.cash_collected}
              onChange={e => handleFinancialChange('cash_collected', e.target.value)}
              onBlur={saveFinancial}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="label">Facturación Generada (€)</label>
            <input
              type="number"
              value={financial.facturacion_generada}
              onChange={e => handleFinancialChange('facturacion_generada', e.target.value)}
              onBlur={saveFinancial}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        {savingFinancial && (
          <p className="text-dark-500 text-xs mt-3 flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border border-dark-400 border-t-transparent rounded-full animate-spin" />
            Guardando...
          </p>
        )}
      </div>

      {/* Performance Summary */}
      <PerformanceSummary totals={totals} leads={leads} cashCollected={parseFloat(financial.cash_collected) || 0} />
    </div>
  )
}

function PerformanceSummary({ totals, leads, cashCollected }) {
  const cierres = totals.close_call + totals.close_followup
  const shows = totals.show
  const ofertas = totals.offer

  const leadsWithSalesCycle = leads.filter(
    l => l.days_offer_to_close !== '' && l.days_offer_to_close !== null && l.days_offer_to_close !== undefined
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
    {
      label: 'Número de Shows',
      value: shows.toString(),
      color: 'blue',
    },
    {
      label: 'Número de Ofertas Presentadas',
      value: ofertas.toString(),
      color: 'blue',
    },
    {
      label: 'Número de Cierres',
      value: cierres.toString(),
      color: 'emerald',
    },
    {
      label: 'Offer to Close %',
      value: fmtPct(pct(cierres, ofertas)),
      color: 'emerald',
    },
    {
      label: 'Show to Close %',
      value: fmtPct(pct(cierres, shows)),
      color: 'emerald',
    },
    {
      label: 'Closed on First Call %',
      value: fmtPct(pct(totals.close_call, ofertas)),
      color: 'amber',
    },
    {
      label: 'Average Downsell %',
      value: fmtPct(pct(totals.downsell, cierres)),
      color: 'red',
    },
    {
      label: 'Average Deal Size',
      value: fmtEur(div(cashCollected, cierres)),
      color: 'purple',
    },
    {
      label: 'Decision Maker Rate %',
      value: fmtPct(pct(totals.decision_maker, shows)),
      color: 'blue',
    },
    {
      label: 'Budget Qualification Rate %',
      value: fmtPct(pct(totals.budget, ofertas)),
      color: 'blue',
    },
    {
      label: 'MAP Confirmation Rate %',
      value: fmtPct(pct(totals.next_step, ofertas)),
      color: 'amber',
    },
    {
      label: 'Sales Cycle (días)',
      value: fmtNum(avgSalesCycle),
      color: 'purple',
    },
    {
      label: 'Revenue per Show',
      value: fmtEur(div(cashCollected, shows)),
      color: 'emerald',
    },
    {
      label: 'Revenue per Offer',
      value: fmtEur(div(cashCollected, ofertas)),
      color: 'emerald',
    },
    {
      label: 'Revenue Mensual (comisión 10%)',
      value: fmtEur(cashCollected * 0.1),
      color: 'brand',
    },
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
      <h2 className="text-base font-semibold text-white mb-4">Resumen Performance</h2>
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
