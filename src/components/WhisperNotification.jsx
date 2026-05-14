import { useEffect, useState } from 'react'
import './WhisperNotification.css'

const LINES = [
  '你收到了一封来自远方的信',
  '有一封信，正在轻轻等你。',
  '今晚有人给你留了一句话。',
  '打开看看吧，有人在想你。',
  '有些心事，只想悄悄说给你听。',
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

export default function WhisperNotification({ count, onClick, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const [line] = useState(() => pick(LINES))

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 500)
    }, 5500)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className={`wn ${visible ? 'wn--in' : ''}`}
      onClick={() => { setVisible(false); setTimeout(onClick, 300) }}
      role="button"
    >
      <div className="wn__card">
        <span className="wn__icon">💌</span>
        <div className="wn__body">
          <span className="wn__text">{line}</span>
          {count > 1 && (
            <span className="wn__badge">{count}封</span>
          )}
        </div>
        <span className="wn__arrow">→</span>
      </div>
    </div>
  )
}
