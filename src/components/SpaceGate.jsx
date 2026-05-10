import { useState, useEffect } from 'react'
import { createSpace, joinSpace, leaveSpace } from '../lib/spaces'
import { updateDisplayName } from '../lib/profiles'
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

  const [memberCount,  setMemberCount]  = useState(null)
  const [copied,       setCopied]       = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [leaveError,   setLeaveError]   = useState('')

  // Nickname state
  const [displayName,  setDisplayName]  = useState('')
  const [editingNick,  setEditingNick]  = useState(false)
  const [nickValue,    setNickValue]    = useState('')
  const [savingNick,   setSavingNick]   = useState(false)
  const [nickError,    setNickError]    = useState('')

  useEffect(() => {
    if (!space) return
    console.log('[SpaceGate] currentSpace.id:', space.id, '| user:', user?.id)
    supabase
      .from('space_members')
      .select('*', { count: 'exact', head: true })
      .eq('space_id', space.id)
      .then(({ count }) => {
        console.log('[SpaceGate] member count:', count)
        setMemberCount(count)
      })
  }, [space?.id])

  // Load the current user's display name
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || '')
      })
  }, [user?.id])

  const handleCopy = () => {
    navigator.clipboard.writeText(space.invite_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const startEditNick = () => {
    setNickValue(displayName)
    setNickError('')
    setEditingNick(true)
  }

  const handleSaveNick = async () => {
    const trimmed = nickValue.trim()
    if (!trimmed) { setNickError('昵称不能为空'); return }
    setSavingNick(true)
    const ok = await updateDisplayName(user.id, trimmed)
    setSavingNick(false)
    if (ok) {
      setDisplayName(trimmed)
      setEditingNick(false)
    } else {
      setNickError('保存失败，请重试')
    }
  }

  const handleLeave = async () => {
    setLeaveLoading(true)
    setLeaveError('')
    console.log('[SpaceGate] leaving space:', space.id)
    const { error } = await leaveSpace()
    console.log('[SpaceGate] leave result:', error ? `error: ${error}` : 'success')
    if (error) {
      setLeaveError(error)
      setLeaveLoading(false)
      return
    }
    await refreshSpace()
    setLeaveLoading(false)
    onSuccess()
  }

  return (
    <>
      <p className="sg__section-title">当前空间</p>

      <p className="sg__status-msg">
        我已经在{' '}
        <span className="sg__status-code">{space.invite_code}</span>
        {' '}空间里了
      </p>

      {memberCount !== null && (
        <p className="sg__member-count">
          当前成员：{memberCount}/2
          {memberCount >= 2 && <span className="sg__member-full"> · 已满</span>}
        </p>
      )}

      <CodeRow code={space.invite_code} copied={copied} onCopy={handleCopy} />

      <div className="sg__divider" />

      {/* ── Nickname editor ── */}
      <p className="sg__section-title">我的昵称</p>

      {editingNick ? (
        <div className="sg__nick-form">
          <input
            className="sg__nick-input"
            value={nickValue}
            onChange={e => setNickValue(e.target.value.slice(0, 20))}
            placeholder="输入你的昵称"
            autoFocus
          />
          {nickError && <p className="sg__error">{nickError}</p>}
          <div className="sg__nick-btns">
            <button
              className="sg__enter"
              onClick={handleSaveNick}
              disabled={savingNick || !nickValue.trim()}
            >
              {savingNick ? '保存中…' : '保存昵称'}
            </button>
            <button className="sg__back" onClick={() => { setEditingNick(false); setNickError('') }}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="sg__nick-row">
          <span className="sg__nick-display">
            当前昵称：{displayName || '未设置'}
          </span>
          <button className="sg__nick-edit" onClick={startEditNick}>
            ✎ 修改
          </button>
        </div>
      )}

      <div className="sg__divider" />

      {leaveConfirm ? (
        <div className="sg__leave-confirm">
          <span className="sg__leave-confirm-text">确认要退出当前空间？</span>
          {leaveError && <p className="sg__error">{leaveError}</p>}
          <div className="sg__leave-confirm-btns">
            <button
              className="sg__leave-confirm-yes"
              onClick={handleLeave}
              disabled={leaveLoading}
            >
              {leaveLoading ? '退出中…' : '确认退出'}
            </button>
            <button
              className="sg__leave-confirm-no"
              onClick={() => { setLeaveConfirm(false); setLeaveError('') }}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button className="sg__leave" onClick={() => setLeaveConfirm(true)}>
          退出当前空间
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
  const { user, refreshSpace, applySpace } = useAuth()

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
    console.log('[SpaceGate] created space:', newSpace?.id, 'user:', user?.id)
    // Confirm via get_my_space RPC so context reflects the real DB state
    const freshSpace = await refreshSpace()
    console.log('[SpaceGate] currentSpace after create:', freshSpace?.id ?? 'none')
    setCreatedCode(newSpace.invite_code)
    setMode('created')
  }

  const handleEnterCreated = async () => {
    setLoading(true)
    const freshSpace = await refreshSpace()
    console.log('[SpaceGate] currentSpace on enter:', freshSpace?.id ?? 'none')
    setLoading(false)
    onSuccess()
  }

  const handleJoin = async () => {
    if (joinCode.trim().length < 8 || loading) return
    setLoading(true)
    setError('')
    console.log('[SpaceGate] joining space — user:', user?.id, 'code:', joinCode)
    const { error: err } = await joinSpace(joinCode.trim())
    if (err) { setError(err); setLoading(false); return }
    // Call get_my_space RPC immediately after join to get confirmed space state
    console.log('[SpaceGate] join RPC success, calling get_my_space...')
    const freshSpace = await refreshSpace()
    console.log('[SpaceGate] currentSpace after join:', freshSpace?.id ?? 'none')
    setLoading(false)
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
        placeholder="例如 6409796D"
        value={joinCode}
        onChange={e => {
          const v = e.target.value.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
          console.log('[SpaceGate] joinCode input length:', v.length, 'value:', v)
          setJoinCode(v)
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
      />
      {error && <p className="sg__error">{error}</p>}
      <button
        className="sg__enter"
        onClick={handleJoin}
        disabled={loading || joinCode.trim().length < 8}
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
