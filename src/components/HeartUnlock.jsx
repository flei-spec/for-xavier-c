import { useState, useEffect } from 'react'
import './HeartUnlock.css'

// Appears after 5 heart taps — lets the user pick which secret to open.
export default function HeartUnlock({ onLetter, onDiary, onClose }) {
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
        <p className="hu__label">五次的心意</p>

        <div className="hu__choices">
          <button
            className="hu__choice hu__choice--letter"
            onClick={onLetter}
          >
            <span className="hu__choice-icon">💌</span>
            <span className="hu__choice-text">读悄悄话</span>
          </button>

          <button
            className="hu__choice hu__choice--diary"
            onClick={onDiary}
          >
            <span className="hu__choice-icon">✎</span>
            <span className="hu__choice-text">今天我想对你说…</span>
          </button>
        </div>
      </div>
    </div>
  )
}
