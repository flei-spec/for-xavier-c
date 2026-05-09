import { useState, useEffect } from 'react'
import { randomOldEntry } from '../utils/journal'
import { useAuth } from '../contexts/AuthContext'
import './MemoryEcho.css'

export default function MemoryEcho() {
  const { user, space } = useAuth()
  const [entry, setEntry] = useState(undefined)

  useEffect(() => {
    if (!user) { setEntry(null); return }
    randomOldEntry({ spaceId: space?.id ?? null, userId: user.id }).then(setEntry)
  }, [user?.id, space?.id])

  if (entry == null) return null

  const preview = entry.content.length > 36
    ? entry.content.slice(0, 36) + '…'
    : entry.content

  return (
    <p className="echo">
      以前的你说过：「{preview}」
    </p>
  )
}
