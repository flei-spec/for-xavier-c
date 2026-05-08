import { useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import './HiddenLoveLetter.css'

export default function HiddenLoveLetter({ onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  const paragraphs = profile.loveLetter.split('\n\n')

  return (
    <div
      className={`letter__overlay ${visible ? 'letter__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="letter__modal">
        <button className="letter__close" onClick={close}>✕</button>

        <div className="letter__header">
          <span className="letter__seal">💌</span>
          <p className="letter__stamp">只给你看</p>
        </div>

        <div className="letter__body">
          {paragraphs.map((para, i) => (
            <p key={i} className={`letter__para ${i === 0 ? 'letter__para--first' : ''}`}>
              {para}
            </p>
          ))}
        </div>

        <div className="letter__footer">✦</div>
      </div>
    </div>
  )
}
