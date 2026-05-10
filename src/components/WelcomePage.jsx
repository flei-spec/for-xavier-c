import { useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import { useAuth } from '../contexts/AuthContext'
import LocalAtmosphereCard from './LocalAtmosphereCard'
import AuthModal from './AuthModal'
import './WelcomePage.css'

export default function WelcomePage({ onEnter, atmosphere }) {
  const { user, signOut } = useAuth()
  const [ready,    setReady]    = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`welcome ${ready ? 'welcome--ready' : ''}`}>
      <div className="welcome__glow" />

      {/* ── Auth indicator — top right ── */}
      <div className="welcome__auth-bar">
        {user ? (
          <>
            <span className="welcome__auth-name">
              {user.email.split('@')[0]}
            </span>
            <button className="welcome__auth-action" onClick={signOut}>
              退出
            </button>
          </>
        ) : (
          <button
            className="welcome__auth-action welcome__auth-action--login"
            onClick={() => setShowAuth(true)}
          >
            登录 / 注册
          </button>
        )}
      </div>

      <div className="welcome__body">

        {/* ── Weather / time / location card ── */}
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

        {/* ── Call to action ── */}
        <div className="welcome__actions">
          <button className="welcome__cta" onClick={onEnter}>
            开始今日的电台
          </button>
          <p className="welcome__from">来自 {profile.fromName}，带着全部的心意 ♡</p>
        </div>

      </div>

      {showAuth && (
        <AuthModal onSuccess={() => setShowAuth(false)} />
      )}
    </div>
  )
}
