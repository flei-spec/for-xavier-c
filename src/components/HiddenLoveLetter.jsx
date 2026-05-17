import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchUnreadSecretLetters, markLetterAsRead, saveSecretLetter } from '../utils/journal'
import './HiddenLoveLetter.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function HiddenLoveLetter({ onClose, onCloseAll }) {
  const { user, space } = useAuth()
  const [visible, setVisible] = useState(false)

  // Reading: unread letter from partner
  const [partnerLetter, setPartnerLetter] = useState(undefined) // undefined=loading, null=none

  // Writing: new secret letter
  const [text,    setText]    = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  const textareaRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  // Load partner's most recent unread letter; mark it as read immediately.
  useEffect(() => {
    if (!user) { setPartnerLetter(null); return }
    fetchUnreadSecretLetters({
      spaceId: space?.id ?? null,
      userId:  user.id,
    }).then(letters => {
      const letter = letters[0] ?? null
      setPartnerLetter(letter)
      if (letter) markLetterAsRead(letter.id, user.id)
    })
  }, [user?.id, space?.id])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  const closeAll = () => {
    setVisible(false)
    setTimeout(onCloseAll ?? onClose, 380)
  }

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const ok = await saveSecretLetter({
      text:    text.trim(),
      spaceId: space?.id ?? null,
      userId:  user?.id  ?? null,
    })
    setSending(false)
    if (ok) {
      setText('')
      setSent(true)
      setTimeout(() => setSent(false), 2500)
    }
  }

  return (
    <div
      className={`letter__overlay ${visible ? 'letter__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="letter__modal">
        <button className="letter__back" onClick={close}>← 返回</button>
        <button className="letter__close" onClick={closeAll}>✕</button>

        <div className="letter__header">
          <span className="letter__seal">💌</span>
          <p className="letter__stamp">悄悄话</p>
        </div>

        {/* ── Partner's unread letter ── */}
        {partnerLetter === undefined && (
          <p className="letter__state">读取中…</p>
        )}

        {partnerLetter !== undefined && partnerLetter !== null && (
          <div className="letter__received">
            <p className="letter__received-label">来自另一半的悄悄话</p>
            <div className="letter__body">
              <p className="letter__para letter__para--first">{partnerLetter.content}</p>
              <p className="letter__date">{formatDate(partnerLetter.created_at)}</p>
            </div>
            <div className="letter__divider-text">✦</div>
          </div>
        )}

        {/* ── Write a new secret letter ── */}
        <div className="letter__write-section">
          <p className="letter__write-label">写给 Ta 一封悄悄话</p>
          <p className="letter__write-hint">Ta 打开才能看到，读完后出现在记录里</p>
          <textarea
            ref={textareaRef}
            className="letter__textarea"
            placeholder="把想说的话写给 Ta…"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
          />
          <div className="letter__write-footer">
            {sent && <span className="letter__sent">已发送 ✦</span>}
            <button
              className="letter__send"
              onClick={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? '发送中…' : '发送悄悄话'}
            </button>
          </div>
        </div>

        <div className="letter__footer">✦</div>
      </div>
    </div>
  )
}
