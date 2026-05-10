import { useState, useEffect, useRef } from 'react'
import { moods } from '../data/romanticProfile'
import './CustomMoodInput.css'

const MAX = 120

// ── State machine ─────────────────────────────────────────────────────────────
// 'idle'    → textarea + submit button
// 'loading' → "电台正在听你说…" animation
// 'result'  → matched mood + emotional line + confirm button

export default function CustomMoodInput({ onMatch, onClose }) {
  const [phase,   setPhase]   = useState('idle')
  const [text,    setText]    = useState('')
  const [visible, setVisible] = useState(false)
  const [result,  setResult]  = useState(null)   // { matchedMood, emotionalLine, provider }
  const [error,   setError]   = useState('')
  const textareaRef = useRef(null)
  const abortRef    = useRef(null)

  // Fade-in on open
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true)
      textareaRef.current?.focus()
    }, 40)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    abortRef.current?.abort()
    setTimeout(onClose, 360)
  }

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || phase === 'loading') return

    setPhase('loading')
    setError('')

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const hour = new Date().getHours()
    const timeOfDay = hour < 6 ? '深夜' : hour < 12 ? '早上' : hour < 18 ? '下午' : '晚上'

    try {
      const res = await fetch('/api/ai-mood-match', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: trimmed, timeOfDay }),
        signal:  ctrl.signal,
      })

      if (!res.ok) throw new Error(`http_${res.status}`)
      const data = await res.json()

      if (!data?.matchedMood) throw new Error('bad_response')

      setResult(data)
      setPhase('result')
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError('出了一点小问题，再试一次？')
      setPhase('idle')
    }
  }

  const handleConfirm = () => {
    if (!result) return
    const moodObj = moods.find(m => m.id === result.matchedMood)
    if (!moodObj) return
    // onMatch triggers handleStartStation in App — must happen in a click handler
    // so the audio gesture is registered synchronously.
    onMatch(moodObj)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  return (
    <div
      className={`cmi__overlay ${visible ? 'cmi__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="cmi__modal">
        <button className="cmi__close" onClick={close} aria-label="关闭">✕</button>

        {/* ── Idle: input form ── */}
        {phase === 'idle' && (
          <>
            <div className="cmi__header">
              <span className="cmi__icon">✦</span>
              <p className="cmi__title">我现在感觉…</p>
              <p className="cmi__sub">说出来，我帮你找一首歌</p>
            </div>

            <textarea
              ref={textareaRef}
              className="cmi__textarea"
              placeholder="比如：今天有点想你，也有点累"
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX))}
              onKeyDown={handleKeyDown}
              rows={3}
            />

            <div className="cmi__footer">
              <span className="cmi__chars">{text.length} / {MAX}</span>
              {error && <span className="cmi__error">{error}</span>}
              <button
                className="cmi__submit"
                onClick={handleSubmit}
                disabled={!text.trim()}
              >
                帮我找一首歌
              </button>
            </div>
          </>
        )}

        {/* ── Loading ── */}
        {phase === 'loading' && (
          <div className="cmi__loading">
            <div className="cmi__dots">
              <span /><span /><span />
            </div>
            <p className="cmi__loading-text">电台正在听你说…</p>
          </div>
        )}

        {/* ── Result ── */}
        {phase === 'result' && result && (
          <div className="cmi__result">
            <p className="cmi__guess-label">我猜你现在更像是</p>

            {(() => {
              const moodObj = moods.find(m => m.id === result.matchedMood)
              return (
                <div
                  className="cmi__matched-mood"
                  style={{ '--cmi-accent': moodObj?.accentColor ?? '#f4a1b0' }}
                >
                  <span className="cmi__matched-icon">{moodObj?.icon ?? '✦'}</span>
                  <span className="cmi__matched-label">{result.matchedMood}</span>
                </div>
              )
            })()}

            <p className="cmi__line">「{result.emotionalLine}」</p>

            <button className="cmi__confirm" onClick={handleConfirm}>
              开始这个心情的歌单  ✦
            </button>

            <button className="cmi__retry" onClick={() => { setPhase('idle'); setResult(null) }}>
              重新输入
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
