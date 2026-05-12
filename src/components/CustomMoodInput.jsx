import { useState, useEffect, useRef } from 'react'
import { moods } from '../data/romanticProfile'
import './CustomMoodInput.css'

const MAX = 120

// ── State machine ─────────────────────────────────────────────────────────────
// 'idle'       → textarea + submit button
// 'loading'    → "电台正在听你说…" animation
// 'transition' → matched mood + emotional line → auto-navigate after fade

export default function CustomMoodInput({ onMatch, onClose }) {
  const [phase,   setPhase]   = useState('idle')
  const [text,    setText]    = useState('')
  const [visible, setVisible] = useState(false)
  const [result,  setResult]  = useState(null)   // { matchedMood, emotionalLine, provider, moodObj }
  const [error,   setError]   = useState('')
  const textareaRef        = useRef(null)
  const abortRef           = useRef(null)
  const transitionTimerRef = useRef(null)

  // Fade-in on open
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true)
      textareaRef.current?.focus()
    }, 40)
    return () => clearTimeout(t)
  }, [])

  // Cleanup timers and abort on unmount
  useEffect(() => {
    return () => {
      clearTimeout(transitionTimerRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const close = () => {
    setVisible(false)
    clearTimeout(transitionTimerRef.current)
    abortRef.current?.abort()
    setTimeout(onClose, 360)
  }

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || phase !== 'idle') return

    setPhase('loading')
    setError('')

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/ai-mood-match', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: trimmed }),
        signal:  ctrl.signal,
      })

      if (!res.ok) throw new Error(`http_${res.status}`)
      const data = await res.json()

      if (!data?.matchedMood) throw new Error('bad_response')

      const moodObj = moods.find(m => m.id === data.matchedMood)
      if (!moodObj) throw new Error('unknown_mood')

      setResult({ ...data, moodObj })
      setPhase('transition')

      // Auto-navigate to the music after a brief cinematic pause
      transitionTimerRef.current = setTimeout(() => {
        onMatch(moodObj)
      }, 2200)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError('出了一点小问题，再试一次？')
      setPhase('idle')
    }
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

        {/* ── Transition → auto-navigates to station ── */}
        {phase === 'transition' && result && (
          <div className="cmi__transition">
            <p className="cmi__line">「{result.emotionalLine}」</p>

            <div className="cmi__progress-dots">
              <span className="cmi__pd cmi__pd--1" />
              <span className="cmi__pd cmi__pd--2" />
              <span className="cmi__pd cmi__pd--3" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
