import { useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import AuthModal from './AuthModal'
import './AuthLanding.css'

export default function AuthLanding({ onGuestMode }) {
  const [ready,    setReady]    = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authTab,  setAuthTab]  = useState('login')

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  const openLogin  = () => { setAuthTab('login');  setShowAuth(true) }
  const openSignup = () => { setAuthTab('signup'); setShowAuth(true) }

  return (
    <div className={`al ${ready ? 'al--ready' : ''}`}>
      <div className="al__glow" />

      <div className="al__body">

        <div className="al__hero">
          <span className="al__seal">♡</span>
          <h1 className="al__title">
            <span className="al__for">For</span>
            <span className="al__name">{profile.fullName}</span>
          </h1>
          <p className="al__sub">为每日、想念、和你而存在。</p>
          <p className="al__tagline">这是一个只为你打开的私人频率。</p>
        </div>

        <div className="al__actions">
          <div className="al__auth-row">
            <button className="al__btn al__btn--login"  onClick={openLogin}>
              登录
            </button>
            <button className="al__btn al__btn--signup" onClick={openSignup}>
              注册
            </button>
          </div>

          <div className="al__sep"><span>或</span></div>

          <button className="al__guest" onClick={onGuestMode}>
            游客模式进入
          </button>
          <p className="al__guest-note">
            游客模式下无法保存悄悄话、记录和双人空间
          </p>
        </div>

      </div>

      {showAuth && (
        <AuthModal
          initialTab={authTab}
          onSuccess={() => setShowAuth(false)}
        />
      )}
    </div>
  )
}
