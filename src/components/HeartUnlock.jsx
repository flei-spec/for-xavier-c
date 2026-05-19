import { useState, useEffect } from 'react'
import './HeartUnlock.css'

export default function HeartUnlock({ onLetter, onDiary, onSpace, onRecords, onVoice, onAlbum, onClose, onLogout, isPrivateSpace, unreadLetterCount = 0 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className={`hu__overlay ${visible ? 'hu__overlay--in' : ''}`}
      onClick={dismiss}
    >
      <div className="hu__card" onClick={e => e.stopPropagation()}>
        <div className="hu__seal">♡</div>
        <p className="hu__label">私密专区</p>

        <div className="hu__grid">
          {isPrivateSpace ? (
            <>
              {/* Private space: 3×2 grid */}
              <button className="hu__choice hu__choice--voice" onClick={onVoice}>
                <span className="hu__choice-icon">📻</span>
                <span className="hu__choice-text">侧写师的声纹档案</span>
              </button>

              <button className="hu__choice hu__choice--diary" onClick={onDiary}>
                <span className="hu__choice-icon">✎</span>
                <span className="hu__choice-text">养草人的观察小记</span>
              </button>

              <button
                className={`hu__choice hu__choice--letter${unreadLetterCount > 0 ? ' hu__choice--unread' : ''}`}
                onClick={onLetter}
              >
                <span className="hu__choice-icon">💌</span>
                <span className="hu__choice-text">读悄悄话</span>
                {unreadLetterCount > 0 && (
                  <span className="hu__unread-hint">
                    <span className="hu__unread-dot" />
                    你收到了一封悄悄话
                  </span>
                )}
              </button>

              <button className="hu__choice hu__choice--records" onClick={onRecords}>
                <span className="hu__choice-icon">📖</span>
                <span className="hu__choice-text">记录</span>
              </button>

              <button className="hu__choice hu__choice--album" onClick={onAlbum}>
                <span className="hu__choice-icon">📷</span>
                <span className="hu__choice-text">相册</span>
              </button>

              {/* Space button shares last row — no full-width span */}
              <button className="hu__choice hu__choice--space hu__choice--space-half" onClick={onSpace}>
                <span className="hu__choice-icon">♡</span>
                <span className="hu__choice-text">双人空间</span>
              </button>
            </>
          ) : (
            <>
              {/* Non-private: original 5-button layout */}
              <button className="hu__choice hu__choice--letter" onClick={onLetter}>
                <span className="hu__choice-icon">💌</span>
                <span className="hu__choice-text">读悄悄话</span>
              </button>

              <button className="hu__choice hu__choice--diary" onClick={onDiary}>
                <span className="hu__choice-icon">✎</span>
                <span className="hu__choice-text">今天我想说…</span>
              </button>

              <button className="hu__choice hu__choice--voice" onClick={onVoice}>
                <span className="hu__choice-icon">📻</span>
                <span className="hu__choice-text">语音信箱</span>
              </button>

              <button className="hu__choice hu__choice--records" onClick={onRecords}>
                <span className="hu__choice-icon">📖</span>
                <span className="hu__choice-text">记录</span>
              </button>

              <button className="hu__choice hu__choice--space" onClick={onSpace}>
                <span className="hu__choice-icon">♡</span>
                <span className="hu__choice-text">双人空间</span>
              </button>
            </>
          )}
        </div>

        {onLogout && (
          <button className="hu__logout" onClick={onLogout}>退出登录</button>
        )}
      </div>
    </div>
  )
}
