import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function ConfettiCelebration({ trigger, onComplete }) {
  useEffect(() => {
    if (!trigger) return

    const duration = 3000
    const end = Date.now() + duration
    const colors = ['#6366f1', '#818cf8', '#a5b8fc', '#fbbf24', '#34d399', '#f472b6']

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      } else {
        onComplete?.()
      }
    }

    // Big burst first
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors,
    })

    setTimeout(() => requestAnimationFrame(frame), 300)
  }, [trigger])

  if (!trigger) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-dark-800/90 border border-brand-500/50 rounded-2xl p-8 text-center shadow-2xl shadow-brand-600/20 pointer-events-auto animate-slide-up mx-4">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Objetivo Superado!</h2>
        <p className="text-dark-300 mb-6">Has alcanzado tu meta. ¡Sigue así, crack!</p>
        <button
          onClick={onComplete}
          className="btn-primary px-8 py-3 text-base font-semibold"
        >
          ¡Gracias! 🎉
        </button>
      </div>
    </div>
  )
}
