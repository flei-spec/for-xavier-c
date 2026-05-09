import { useState, useEffect } from 'react'
import { randomOldEntry } from '../utils/journal'
import './MemoryEcho.css'

// Fetched once on mount and kept stable for the whole session.
export default function MemoryEcho() {
  const [entry, setEntry] = useState(undefined)  // undefined = not yet resolved

  useEffect(() => {
    randomOldEntry().then(setEntry)
  }, [])

  if (entry == null) return null  // covers undefined (loading) and null (no old entries)

  const preview = entry.content.length > 36
    ? entry.content.slice(0, 36) + '…'
    : entry.content

  return (
    <p className="echo">
      以前的你说过：「{preview}」
    </p>
  )
}
