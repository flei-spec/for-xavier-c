import { useState, useEffect } from 'react'
import { createSpace, joinSpace, leaveSpace } from '../lib/spaces'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './SpaceGate.css'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function CodeRow({ code, copied, onCopy }) {
  return (
    <div className="sg__code-row">
      <span className="sg__code">{code}</span>
      <button className="sg__copy" onClick={onCopy}>
        {copied ? '已复制 ✓' : '复制'}
      </button>
    </div>
  )
}

// ── Has-space view ─────────────────────────────────────────────────────────────

function StatusView({ onSuccess }) {
  const { user, space, refreshSpace } = useAuth()

  const [memberCount,   setMemberCount]   = useState(null)
  const [copied,        setCopied]        = useState(false)
  const [switchCode,    setSwitchCode]    = useState('')
  const [switchError,   setSwitchError]   = useState('')
  const [switchLoading, setSwitchLoading] = useState(false)
  const [leaveConfirm,  setLeaveConfirm]  = useState(false)
  const [leaveLoading,  setLeaveLoading]  = useState(false)

  useEffect(() => {
    if (!space) return
    console.log('[SpaceGate] current space:', space.id, 'user:', user?.id)
    supabase
      .from('space_members')
      .select('*', { count: 'exact', head: true })
      .eq('space_id', space.id)
      .then(({ count }) => {
        console.log('[SpaceGate] member count:', count)
        setMemberCount(count)
      })
  }, [space?.id])

  const handleCopy = () => {
    navigator.clipboard.writeText(space.invite_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const handleJoinAnother = async () => {
    if (!switchCode.trim() || switchLoading) return
    setSwitchLoading(true)
    setSwitchError('')
    console.log('[SpaceGate] joining another space, leaving current:', space.id)

    const { error: leaveErr } = await leaveSpace(space.id)
    if (leaveErr) {
      setSwitchError('离开当前空间失败，请重试')
      setSwitchLoading(false)
      return
    }

    const { error: joinErr } = await joinSpace(switchCode.trim())
    if (joinErr) {
      console.error('[SpaceGate] join result:', joinErr)
      await refreshSpace()
      setSwitchError(joinErr)
      setSwitchLoading(false)
      return
    }

    console.log('[SpaceGate] joined new space successfully')
    await refreshSpace()
    setSwitchLoading(false)
    onSuccess()
  }

  const handleLeave = async () => {
    setLeaveLoading(true)
    console.log('[SpaceGate] leaving space:', space.id)
    const { error } = await leaveSpace(space.id)
    if (error) {
      setLeaveLoading(false)
      setLeaveConfirm(false)
      return
    }
    await refreshSpace()
    setLeaveLoading(false)
    onSuccess()
  }

  return (
    <>
      {/* ── Current space ── */}
      <p className="sg__section-title">当前空间</p>

      <p className="sg__code-label">邀请码</p>
      <CodeRow code={space.invite_code} copied={copied} onCopy={handleCopy} />

      {memberCount !== null && (
        <p className="sg__member-count">
          当前成员：{memberCount}/2
          {memberCount >= 2 && <span className="sg__member-full"> · 已满</span>}
        </p>
      )}

      <div className="sg__divider" />

      {/* ── Join another space ── */}
      <p className="sg__section-title">加入另一个空间</p>
      <p className="sg__warning">⚠ 加入后将自动离开当前空间</p>

      <input
        className="sg__input"
        type="text"
        placeholder="输入邀请码"
        value={switchCode}
        onChange={e => setSwitchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        maxLength={6}
      />

      {switchError && <p className="sg__error">{switchError}</p>}

      <button
        className="sg__enter"
        onClick={handleJoinAnother}
        disabled={switchLoading || switchCode.trim().length < 6}
      >
        {switchLoading ? '处理中…' : '加入新空间'}
      </button>

      <div className="sg__divider" />

      {/* ── Leave + close ── */}
      {leaveConfirm ? (
        <div className="sg__leave-confirm">
          <span className="sg__leave-confirm-text">确认要离开当前空间？</span>
          <div className="sg__leave-confirm-btns">
            <button
              className="sg__leave-confirm-yes"
              onClick={handleLeave}
              disabled={leaveLoading}
            >
              {leaveLoading ? '离开中…' : '确认离开'}
            </button>
            <button
              className="sg__leave-confirm-no"
              onClick={() => setLeaveConfirm(false)}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button className="sg__leave" onClick={() => setLeaveConfirm(true)}>
          离开当前空间
        </button>
      )}

      <button className="sg__enter sg__enter--ghost" onClick={onSuccess}>
        关闭
      </button>
    </>
  )
}

// ── No-space view (create / join) ──────────────────────────────────────────────

function SetupView({ onSuccess }) {
  const { refreshSpace } = useAuth()

  const [mode,        setMode]        = useState('choose')
  const [createdCode, setCreatedCode] = useState('')
  const [joinCode,    setJoinCode]    = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [copied,      setCopied]      = useState(false)

  const handleCreate = async () => {
    setMode('create-loading')
    setError('')
    const { space: newSpace, error: err } = await createSpace()
    if (err) { setMode('choose'); setError(err); return }
    setCreatedCode(newSpace.invite_code)
    setMode('created')
  }

  const handleEnterCreated = async () => {
    setLoading(true)
    await refreshSpace()
    setLoading(false)
    onSuccess()
  }

  const handleJoin = async () => {
    if (joinCode.trim().length < 6 || loading) return
    setLoading(true)
    setError('')
    console.log('[SpaceGate] joining space with code:', joinCode)
    const { error: err } = await joinSpace(joinCode.trim())
    setLoading(false)
    if (err) { setError(err); return }
    await refreshSpace()
    onSuccess()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  if (mode === 'choose') return (
    <>
      {error && <p className="sg__error sg__error--top">{error}</p>}
      <div className="sg__choices">
        <button className="sg__choice" onClick={handleCreate}>
          <span className="sg__choice-icon">✦</span>
          <div className="sg__choice-body">
            <span className="sg__choice-text">创建我们的空间</span>
            <span className="sg__choice-hint">生成邀请码，邀请另一半加入</span>
          </div>
        </button>
        <button className="sg__choice sg__choice--join" onClick={() => { setMode('join'); setError('') }}>
          <span className="sg__choice-icon">💌</span>
          <div className="sg__choice-body">
            <span className="sg__choice-text">加入已有空间</span>
            <span className="sg__choice-hint">输入另一半给你的邀请码</span>
          </div>
        </button>
      </div>
    </>
  )

  if (mode === 'create-loading') return (
    <p className="sg__loading">正在为你们生成专属空间…</p>
  )

  if (mode === 'created') return (
    <div className="sg__created">
      <p className="sg__code-label">你们的邀请码</p>
      <CodeRow code={createdCode} copied={copied} onCopy={handleCopy} />
      <p className="sg__code-hint">
        把这串码发给另一半<br />他/她加入后，你也点击「进入」
      </p>
      <button className="sg__enter" onClick={handleEnterCreated} disabled={loading}>
        {loading ? '进入中…' : '进入空间'}
      </button>
    </div>
  )

  if (mode === 'join') return (
    <div className="sg__join">
      <label className="sg__label">输入邀请码</label>
      <input
        className="sg__input"
        type="text"
        placeholder="例如 AB3K7M"
        value={joinCode}
        onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        maxLength={6}
        autoFocus
      />
      {error && <p className="sg__error">{error}</p>}
      <button
        className="sg__enter"
        onClick={handleJoin}
        disabled={loading || joinCode.trim().length < 6}
      >
        {loading ? '加入中…' : '加入'}
      </button>
      <button className="sg__back" onClick={() => { setMode('choose'); setError('') }}>
        ← 返回
      </button>
    </div>
  )

  return null
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function SpaceGate({ onSuccess }) {
  const { space } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`sg__overlay ${visible ? 'sg__overlay--in' : ''}`}>
      <div className="sg__card">
        <span className="sg__seal">♡</span>
        <p className="sg__title">你们的专属空间</p>
        <p className="sg__sub">只属于你们两个人</p>

        {space
          ? <StatusView onSuccess={onSuccess} />
          : <SetupView  onSuccess={onSuccess} />
        }
      </div>
    </div>
  )
}
