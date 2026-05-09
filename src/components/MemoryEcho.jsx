import { useState, useEffect } from 'react'
import { randomOldEntry } from '../utils/journal'
import './MemoryEcho.css'

// Picked once on mount and kept stable for the whole session.
// Re-picks on next page load / refresh.
export default function MemoryEcho() {
  const [entry, setEntry] = useState(undefined)  // undefined = not yet resolved

  useEffect(() => {
    setEntry(randomOldEntry())  // null when no old entries exist
  }, [])

  if (entry == null) return null

  // Truncate so it stays on one line on narrow screens
  const preview = entry.text.length > 36
    ? entry.text.slice(0, 36) + '…'
    : entry.text

  return (
    <p className="echo">
      以前的你说过：「{preview}」
    </p>
  )
}
