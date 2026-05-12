import { useState } from 'react'
import { moods } from '../data/romanticProfile'
import CustomMoodInput from './CustomMoodInput'
import './MoodSelector.css'

export default function MoodSelector({ onStart, onBack }) {
  const [selected,       setSelected]       = useState(null)
  const [showCustomInput, setShowCustomInput] = useState(false)

  return (
    <div className="mood">
      {onBack && (
        <button className="mood__back" onClick={onBack} aria-label="返回">
          ← 返回
        </button>
      )}
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

          {/* Custom mood input card — spans full width below the 3×3 grid */}
          <button
            className="mood__card mood__card--custom"
            onClick={() => setShowCustomInput(true)}
          >
            <span className="mood__icon">✦</span>
            <span className="mood__label">我现在感觉…</span>
            <span className="mood__desc">说出来，我帮你找一首歌</span>
          </button>
        </div>

        <button
          className={`mood__start ${selected ? 'mood__start--ready' : ''}`}
          onClick={() => selected && onStart(selected, false)}
          disabled={!selected}
        >
          {selected ? '开启今日的电台  ✦' : '先选一种心情'}
        </button>
      </div>

      {showCustomInput && (
        <CustomMoodInput
          onMatch={(moodObj) => {
            setShowCustomInput(false)
            onStart(moodObj, true)
          }}
          onClose={() => setShowCustomInput(false)}
        />
      )}
    </div>
  )
}
