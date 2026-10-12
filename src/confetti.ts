// A short confetti burst for real milestones (lead added, lead won, BRD submitted, season unlocked).
// Canvas only, no library. Skipped when the viewer prefers reduced motion.

const COLORS = ['#C0392B', '#EF9F27', '#111111', '#111111', '#111111', '#EAE5DC']

export function fireConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const W = window.innerWidth
  const H = window.innerHeight
  c.width = W * dpr
  c.height = H * dpr
  Object.assign(c.style, { position: 'fixed', inset: '0', width: `${W}px`, height: `${H}px`, pointerEvents: 'none', zIndex: '80' })
  document.body.appendChild(c)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)

  // Two bursts from the lower corners, angled up and in.
  const parts = Array.from({ length: 140 }, (_, i) => {
    const left = i % 2 === 0
    const angle = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9
    const speed = 9 + Math.random() * 9
    return {
      x: left ? W * 0.1 : W * 0.9,
      y: H * 0.85,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length],
    }
  })

  const start = performance.now()
  const DURATION = 1600
  const frame = (t: number) => {
    const k = (t - start) / DURATION
    g.clearRect(0, 0, W, H)
    for (const p of parts) {
      p.vy += 0.35 // gravity
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      g.save()
      g.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4)
      g.translate(p.x, p.y)
      g.rotate(p.r)
      g.fillStyle = p.color
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      g.restore()
    }
    if (k < 1) requestAnimationFrame(frame)
    else c.remove()
  }
  requestAnimationFrame(frame)
}
