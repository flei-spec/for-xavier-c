import { useState } from 'react'
import { moods } from '../data/romanticProfile'
import './MoodSelector.css'

export default function MoodSelector({ onStart }) {
  const [selected, setSelected] = useState(null)

  return (
    <div className="mood">
      <div className="mood__inner">
        <h2 className="mood__heading">今晚的你，好像有一点……</h2>
        <p className="mood__sub">选一种心情——你的电台会做好其余的一切。</p>

        <div className="mood__grid">
          {moods.map((m) => (
            <button
              key={m.id}
              className={`mood__card ${selected?.id === m.id ? 'mood__card--active' : ''}`}
              style={{ '--accent': m.accentColor }}
              onClick={() => setSelected(m)}
            >
              {selected?.id === m.id && <span className="mood__check">✓</span>}
              <span className="mood__icon">{m.icon}</span>
              <span className="mood__label">{m.label}</span>
              <span className="mood__desc">{m.description}</span>
            </button>
          ))}
        </div>

        <button
          className={`mood__start ${selected ? 'mood__start--ready' : ''}`}
          onClick={() => selected && onStart(selected)}
          disabled={!selected}
        >
          {selected ? '开启今日的电台  ✦' : '先选一种心情'}
        </button>
      </div>
    </div>
  )
}
