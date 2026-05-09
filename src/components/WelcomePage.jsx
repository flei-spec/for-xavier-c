import { useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import LocalAtmosphereCard from './LocalAtmosphereCard'
import MemoryEcho from './MemoryEcho'
import './WelcomePage.css'

export default function WelcomePage({ onEnter, atmosphere }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`welcome ${ready ? 'welcome--ready' : ''}`}>
      <div className="welcome__glow" />

      <div className="welcome__body">

        {/* ── Weather / time / location card — always rendered so skeleton shows ── */}
        <div className="welcome__atm">
          <LocalAtmosphereCard atmosphere={atmosphere} compact />
        </div>

        {/* ── Main title ── */}
        <div className="welcome__hero">
          <h1 className="welcome__title">
            <span className="welcome__for">For</span>
            <span className="welcome__name">{profile.fullName}</span>
          </h1>
        </div>

        {/* ── Supporting copy ── */}
        <div className="welcome__text">
          <p className="welcome__sub">为每日、想念、和你而存在。</p>
          <div className="welcome__dots"><span /><span /><span /></div>
          <p className="welcome__tagline">这是一个只为你打开的私人频率。</p>
        </div>

        {/* ── Past memory echo (shows only when old entries exist) ── */}
        <MemoryEcho />

        {/* ── Call to action ── */}
        <div className="welcome__actions">
          <button className="welcome__cta" onClick={onEnter}>
            开始今日的电台
          </button>
          <p className="welcome__from">来自 {profile.fromName}，带着全部的心意 ♡</p>
        </div>

      </div>
    </div>
  )
}
