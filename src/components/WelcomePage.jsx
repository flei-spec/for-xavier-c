import { useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import LocalAtmosphereCard from './LocalAtmosphereCard'
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
        <span className="welcome__badge">🎵 私人电台 · 只为你</span>

        <h1 className="welcome__title">
          For
          <span className="welcome__name">{profile.fullName}</span>
        </h1>

        <p className="welcome__sub">为每日、想念、和你而存在。</p>

        <div className="welcome__dots">
          <span /><span /><span />
        </div>

        <p className="welcome__tagline">这是一个只为你打开的私人频率。</p>

        <button className="welcome__cta" onClick={onEnter}>
          开始今日的电台
        </button>

        <p className="welcome__from">来自 {profile.fromName}，带着全部的心意 ♡</p>

        {atmosphere && (
          <div className="welcome__atm">
            <LocalAtmosphereCard atmosphere={atmosphere} compact />
          </div>
        )}
      </div>
    </div>
  )
}
