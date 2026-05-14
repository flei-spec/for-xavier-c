import { useState, useEffect } from 'react'
import { moodMeta, FALLBACK_ICON } from '../config/moodMeta'
import { useAuth } from '../contexts/AuthContext'
import { getMonthlyStats, getMonthlyTopSongs, generateMonthlyLetter } from '../utils/monthlyMoodAnalysis'
import './MonthlyEmotionalLetter.css'

export default function MonthlyEmotionalLetter({ onClose }) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState('loading') // loading | ready | empty
  const [letter, setLetter] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!user) { setPhase('empty'); return }
    Promise.all([
      getMonthlyStats(user.id),
      getMonthlyTopSongs(user.id),
    ]).then(([stats, topSongs]) => {
      const generated = generateMonthlyLetter(stats, topSongs)
      if (generated) {
        setLetter(generated)
        setPhase('ready')
      } else {
        setPhase('empty')
      }
    })
  }, [user])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(onClose, 400)
  }

  const moodIcon = (moodId) => moodMeta[moodId]?.icon ?? FALLBACK_ICON

  return (
    <div
      className={`mel__overlay ${visible ? 'mel__overlay--in' : ''}`}
      onClick={dismiss}
    >
      <div className="mel__card" onClick={e => e.stopPropagation()}>

        {phase === 'loading' && (
          <div className="mel__loading">
            <span className="mel__loading-icon">✉️</span>
            <p className="mel__loading-text">正在整理上个月的心情…</p>
          </div>
        )}

        {phase === 'empty' && (
          <>
            <p className="mel__label">你的{letter?.monthLabel || '上月'}心情信</p>
            <div className="mel__empty">
              <span className="mel__empty-icon">📭</span>
              <p className="mel__empty-text">
                上个月还没有心情记录。<br />
                这个月开始，每一次心情都会被记住。
              </p>
            </div>
            <button className="mel__close-btn" onClick={dismiss}>知道了</button>
          </>
        )}

        {phase === 'ready' && letter && (
          <>
            {/* ── Header ── */}
            <div className="mel__header">
              <span className="mel__seal">✉️</span>
              <p className="mel__label">你的{letter.monthLabel}心情信</p>
            </div>

            {/* ── Poetic summary ── */}
            <div className="mel__summary">
              <p className="mel__summary-text">「{letter.summary}」</p>
            </div>

            {/* ── Top moods ── */}
            <div className="mel__moods">
              {letter.topMoods.slice(0, 5).map(({ mood, count }) => (
                <div key={mood} className="mel__mood-line">
                  <span className="mel__mood-icon">{moodIcon(mood)}</span>
                  <span className="mel__mood-name">{mood}</span>
                  <span className="mel__mood-dots" />
                  <span className="mel__mood-count">{count}次</span>
                </div>
              ))}
            </div>

            {/* ── Top songs ── */}
            {letter.topSongs.length > 0 && (
              <div className="mel__songs">
                <p className="mel__songs-label">这个月陪你最久的歌</p>
                {letter.topSongs.map(({ title, count }) => (
                  <p key={title} className="mel__song">
                    <span className="mel__song-icon">♫</span>
                    <span className="mel__song-title">{title}</span>
                    <span className="mel__song-count">{count}次</span>
                  </p>
                ))}
              </div>
            )}

            {/* ── Session count ── */}
            <p className="mel__sessions">
              上个月，你一共打开了 <strong>{letter.totalEntries}</strong> 次电台。
            </p>

            {/* ── Closer ── */}
            <p className="mel__closer">{letter.closer}</p>

            {/* ── Dismiss ── */}
            <button className="mel__close-btn" onClick={dismiss}>
              收好这封信 ✦
            </button>
          </>
        )}
      </div>
    </div>
  )
}
