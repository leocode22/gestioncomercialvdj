export default function ProgressBar({ value, max, color = 'brand', showLabel = true, size = 'md' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const isComplete = pct >= 100

  const colorMap = {
    brand: isComplete ? 'bg-emerald-500' : 'bg-brand-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }

  const sizeMap = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-dark-400">{value.toLocaleString()} / {max.toLocaleString()}</span>
          <span className={`text-xs font-semibold ${isComplete ? 'text-emerald-400' : 'text-brand-400'}`}>
            {pct.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={`progress-bar ${sizeMap[size]}`}>
        <div
          className={`progress-fill ${colorMap[color]} ${isComplete ? 'shadow-lg shadow-emerald-500/40' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
