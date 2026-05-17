import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getSupportedMimeType,
  uploadVoiceMessage,
} from '../utils/voiceMessages'
import './VoiceMailbox.css'

const IS_SUPPORTED =
  typeof window !== 'undefined' &&
  navigator.mediaDevices?.getUserMedia != null &&
  typeof MediaRecorder !== 'undefined'

function fmtTime(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function VoiceMailbox({ onClose, onCloseAll }) {
  const { user, space } = useAuth()
  const [visible,    setVisible]    = useState(false)
  const [recording,  setRecording]  = useState(false)
  const [elapsed,    setElapsed]    = useState(0)      // ms while recording
  const [audioBlob,  setAudioBlob]  = useState(null)
  const [audioUrl,   setAudioUrl]   = useState(null)
  const [durationMs, setDurationMs] = useState(0)
  const [mimeType,   setMimeType]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')

  const mrRef        = useRef(null)
  const chunksRef    = useRef([])
  const startRef     = useRef(null)
  const timerRef     = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => {
      clearInterval(timerRef.current)
      // Stop any in-flight recording when unmounting
      if (mrRef.current?.state === 'recording') mrRef.current.stop()
      clearTimeout(t)
    }
  }, [])

  const close = () => {
    setVisible(false)
    if (mrRef.current?.state === 'recording') mrRef.current.stop()
    clearInterval(timerRef.current)
    setTimeout(onClose, 380)
  }

  const closeAll = () => {
    setVisible(false)
    if (mrRef.current?.state === 'recording') mrRef.current.stop()
    clearInterval(timerRef.current)
    setTimeout(onCloseAll ?? onClose, 380)
  }

  const startRecording = async () => {
    setError('')
    setAudioBlob(null)
    setAudioUrl(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime   = getSupportedMimeType()
      setMimeType(mime)
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const dur  = Date.now() - startRef.current
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' })
        setDurationMs(dur)
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        clearInterval(timerRef.current)
        setRecording(false)
      }

      mrRef.current  = mr
      startRef.current = Date.now()
      mr.start(200)
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(
        () => setElapsed(Date.now() - startRef.current),
        200,
      )
    } catch (err) {
      console.error('[VoiceMailbox] getUserMedia error:', err)
      setError('无法访问麦克风，请检查浏览器权限后重试')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (mrRef.current?.state === 'recording') mrRef.current.stop()
  }

  const resetRecording = () => {
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setElapsed(0)
    setDurationMs(0)
    setError('')
  }

  const handleSave = async () => {
    if (!audioBlob || saving) return
    setSaving(true)
    setError('')
    const { error: err } = await uploadVoiceMessage({
      blob:      audioBlob,
      mimeType:  mimeType || 'audio/webm',
      spaceId:   space?.id ?? null,
      userId:    user?.id  ?? null,
      durationMs,
    })
    setSaving(false)
    if (err) {
      setError('保存失败，请重试')
    } else {
      setSaved(true)
      resetRecording()
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <div
      className={`vm__overlay ${visible ? 'vm__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="vm__modal">
        <button className="vm__back" onClick={close}>← 返回</button>
        <button className="vm__close" onClick={closeAll} aria-label="关闭">✕</button>

        <div className="vm__header">
          <span className="vm__icon">📻</span>
          <p className="vm__title">语音信箱</p>
          <p className="vm__subtitle">留下你的声音，只给 Ta 听</p>
        </div>

        {!IS_SUPPORTED ? (
          <p className="vm__unsupported">
            当前浏览器不支持录音功能，请使用 Chrome 或 Safari 最新版。
          </p>
        ) : (
          <div className="vm__body">

            {/* ── No recording yet ── */}
            {!recording && !audioUrl && (
              <button className="vm__record-btn" onClick={startRecording}>
                <span className="vm__mic">🎙️</span>
                开始录音
              </button>
            )}

            {/* ── Recording in progress ── */}
            {recording && (
              <div className="vm__recording">
                <div className="vm__recording-indicator">
                  <span className="vm__rec-dot" />
                  <span className="vm__rec-time">{fmtTime(elapsed)}</span>
                </div>
                <button className="vm__stop-btn" onClick={stopRecording}>
                  ⏹ 结束录音
                </button>
              </div>
            )}

            {/* ── Preview after recording ── */}
            {!recording && audioUrl && (
              <div className="vm__preview">
                <p className="vm__preview-label">预览 · {fmtTime(durationMs)}</p>
                <audio
                  className="vm__player"
                  src={audioUrl}
                  controls
                  preload="metadata"
                />
                <div className="vm__preview-btns">
                  <button className="vm__redo-btn" onClick={resetRecording}>
                    🎙️ 重新录音
                  </button>
                  <button
                    className="vm__save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? '保存中…' : '保存语音留言'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Feedback ── */}
            {error && <p className="vm__error">{error}</p>}
            {saved  && <p className="vm__saved">已保存 ✦</p>}

          </div>
        )}
      </div>
    </div>
  )
}
