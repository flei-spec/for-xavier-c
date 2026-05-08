import { useEffect, useRef } from 'react'
import './StarBackground.css'

export default function StarBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < 45; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      const size = Math.random() * 2 + 0.5
      star.style.cssText = `
        width:${size}px;height:${size}px;
        left:${Math.random() * 100}%;top:${Math.random() * 100}%;
        --dur:${(Math.random() * 5 + 6).toFixed(1)}s;
        --op:${(Math.random() * 0.4 + 0.12).toFixed(2)};
        animation-delay:${(Math.random() * 10).toFixed(1)}s;
      `
      fragment.appendChild(star)
    }
    container.appendChild(fragment)
    return () => { container.innerHTML = '' }
  }, [])

  return <div className="stars-bg" ref={ref} />
}
