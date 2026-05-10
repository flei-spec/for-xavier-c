import { useState, useEffect } from 'react'
import './HeartUnlock.css'

export default function HeartUnlock({ onLetter, onDiary, onSpace, onRecords, onVoice, onClose, onLogout }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  return (
    <div
      className={`hu__overlay ${visible ? 'hu__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="hu__card">
        <div className="hu__seal">♡</div>
        <p className="hu__label">私密专区</p>

        <div className="hu__grid">
          <button className="hu__choice hu__choice--letter" onClick={onLetter}>
            <span className="hu__choice-icon">💌</span>
            <span className="hu__choice-text">读悄悄话</span>
          </button>

          <button className="hu__choice hu__choice--diary" onClick={onDiary}>
            <span className="hu__choice-icon">✎</span>
            <span className="hu__choice-text">今天我想说…</span>
          </button>

          <button className="hu__choice hu__choice--space" onClick={onSpace}>
            <span className="hu__choice-icon">♡</span>
            <span className="hu__choice-text">双人空间</span>
          </button>

          <button className="hu__choice hu__choice--records" onClick={onRecords}>
            <span className="hu__choice-icon">📖</span>
            <span className="hu__choice-text">记录</span>
          </button>

          {/* 5th option — spans full width */}
          <button className="hu__choice hu__choice--voice" onClick={onVoice}>
            <span className="hu__choice-icon">📻</span>
            <span className="hu__choice-text">语音信箱</span>
          </button>
        </div>

        {onLogout && (
          <button className="hu__logout" onClick={onLogout}>退出登录</button>
        )}
      </div>
    </div>
  )
}
