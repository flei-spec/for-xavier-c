import { useState, useEffect, useRef } from 'react'
import './AtmosphereGlow.css'

// Build the CSS background string for one overlay layer.
// Glow blobs sit on top; the sky gradient (if any) fills the bottom.
function makeBg(glow1, glow2, skyGradient) {
  const blobs = [
    `radial-gradient(ellipse 80% 50% at 15% 12%, ${glow1} 0%, transparent 55%)`,
    `radial-gradient(ellipse 62% 42% at 85% 85%, ${glow2} 0%, transparent 52%)`,
    `radial-gradient(ellipse 40% 28% at 50% 50%, rgba(255,255,255,0.012) 0%, transparent 60%)`,
  ]
  return skyGradient
    ? [...blobs, skyGradient].join(', ')
    : blobs.join(', ')
}

/**
 * Double-buffered cross-fade overlay.
 *
 * Two fixed layers (A and B) always exist in the DOM.  When glow values change,
 * the INACTIVE layer receives the new background, then the two layers swap
 * opacities over 1.8 s.  Because only `opacity` transitions (not background),
 * any background content — including gradients — cross-fades smoothly.
 *
 * This gives truly continuous glow transitions that CSS variable changes alone
 * cannot achieve (since background-image doesn't CSS-transition).
 */
export default function AtmosphereGlow({ glow1, glow2, skyGradient }) {
  // Which slot (0 or 1) is currently VISIBLE (opacity 1)
  const [active, setActive] = useState(0)

  // Each slot holds its background string
  const [slots, setSlots] = useState(() => {
    const bg = makeBg(glow1, glow2, skyGradient)
    return [bg, bg]
  })

  // Track previous values to avoid no-op updates
  const prevRef = useRef({ glow1, glow2, skyGradient })

  useEffect(() => {
    const prev = prevRef.current
    if (prev.glow1 === glow1 && prev.glow2 === glow2 && prev.skyGradient === skyGradient) return

    prevRef.current = { glow1, glow2, skyGradient }

    const next = 1 - active   // the currently INVISIBLE slot
    const newBg = makeBg(glow1, glow2, skyGradient)

    // Paint the inactive slot with the new background, then bring it to front
    setSlots(prev => {
      const updated = [...prev]
      updated[next] = newBg
      return updated
    })
    setActive(next)
  }, [glow1, glow2, skyGradient]) // eslint-disable-line react-hooks/exhaustive-deps
  // active intentionally omitted — we read it via closure and update it atomically

  return (
    <div className="atm-glow" aria-hidden="true">
      <div
        className="atm-glow__layer"
        style={{ background: slots[0], opacity: active === 0 ? 1 : 0 }}
      />
      <div
        className="atm-glow__layer"
        style={{ background: slots[1], opacity: active === 1 ? 1 : 0 }}
      />
    </div>
  )
}
