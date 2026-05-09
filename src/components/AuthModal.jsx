import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './AuthModal.css'

export default function AuthModal({ onSuccess }) {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [visible,  setVisible]  = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const switchMode = (m) => { setMode(m); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || loading) return
    setLoading(true)
    setError('')
    console.log('[AuthModal] attempting', mode, 'for:', email)

    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email: email.trim(), password })
      : supabase.auth.signUp({ email: email.trim(), password })

    const { data, error: authErr } = await fn

    if (authErr) {
      console.error('[AuthModal] error:', authErr.message)
      setError(translateError(authErr.message))
      setLoading(false)
      return
    }

    console.log('[AuthModal] success, user:', data.user?.id)
    onSuccess(data.user)
  }

  return (
    <div className={`auth__overlay ${visible ? 'auth__overlay--in' : ''}`}>
      <div className="auth__card">

        <span className="auth__seal">♡</span>
        <p className="auth__title">我们的小空间</p>
        <p className="auth__sub">用心意打开这扇门</p>

        <div className="auth__tabs">
          <button
            className={`auth__tab ${mode === 'login'  ? 'auth__tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >登录</button>
          <button
            className={`auth__tab ${mode === 'signup' ? 'auth__tab--active' : ''}`}
            onClick={() => switchMode('signup')}
          >注册</button>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <label className="auth__label">邮箱</label>
          <input
            className="auth__input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />

          <label className="auth__label">密码</label>
          <input
            className="auth__input"
            type="password"
            placeholder="至少 6 位"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && <p className="auth__error">{error}</p>}

          <button
            className="auth__submit"
            type="submit"
            disabled={loading || !email.trim() || password.length < 6}
          >
            {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

      </div>
    </div>
  )
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials'))    return '邮箱或密码错误'
  if (msg.includes('Email not confirmed'))           return '请先验证邮箱后再登录'
  if (msg.includes('User already registered'))       return '该邮箱已注册，请直接登录'
  if (msg.includes('Password should be at least'))   return '密码至少需要 6 位'
  if (msg.includes('rate limit') || msg.includes('too many')) return '操作太频繁，请稍后再试'
  return msg
}
