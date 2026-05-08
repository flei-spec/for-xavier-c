import { useState, useEffect, useRef } from 'react'
import { getCompanionMessages } from '../utils/atmosphere'
import './CompanionLine.css'

const CYCLE_MS = 42_000   // rotate every 42 seconds

export default function CompanionLine({ moodId }) {
  const messages = getCompanionMessages(moodId)
  const [idx, setIdx]       = useState(() => Math.floor(Math.random() * messages.length))
  const [visible, setVisible] = useState(true)
  const timerRef = useRef(null)

  // When mood changes, reset
  useEffect(() => {
    setIdx(Math.floor(Math.random() * messages.length))
    setVisible(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodId])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      // fade out → change → fade in
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % messages.length)
        setVisible(true)
      }, 600)
    }, CYCLE_MS)
    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodId])

  return (
    <p className={`companion-line ${visible ? 'companion-line--in' : 'companion-line--out'}`}>
      <span className="companion-line__dot" />
      {messages[idx]}
    </p>
  )
}
