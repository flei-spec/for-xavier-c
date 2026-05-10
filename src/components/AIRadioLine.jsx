import { useState, useEffect, useRef } from 'react'
import './AIRadioLine.css'

// Session-scoped cache — keyed by moodId.
// Populated on first load; subsequent mood-switches within the same session
// use the cached line instantly with no extra network request.
const lineCache = new Map()

const FALLBACK_LINES = {
  '想你了':       '今晚有些话，好像只适合想你的时候听。',
  '开心开心':     '今天的心情亮了一点，那就让歌也轻一点。',
  '今天很幸福':   '有些幸福不用说太多，留在这首歌里就好。',
  '需要安慰':     '今天辛苦了，先把自己交给这首歌一会儿。',
  '想被抱抱':     '抱不到的时候，就让声音先靠近你一点。',
  '有点苦恼':     '那今晚先别急着解决所有事，慢慢来就好。',
  '洗澡放松一下': '先把今天慢慢洗掉吧，剩下的交给音乐。',
  '想一个人发呆': '今晚不用解释什么，安静地漂一会儿就好。',
  '今天有点累':   '累了就慢一点，今晚不用证明什么。',
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 6)  return '深夜'
  if (h < 12) return '早上'
  if (h < 18) return '下午'
  return '晚上'
}

export default function AIRadioLine({ mood }) {
  // Initialize from cache if this mood was already fetched this session
  const [line,    setLine]    = useState(() => lineCache.get(mood.id) ?? null)
  const [loading, setLoading] = useState(!lineCache.has(mood.id))
  const [visible, setVisible] = useState(false)
  const abortRef = useRef(null)

  // Fade in after a short delay — cinematic entrance, not jarring
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 350)
    return () => clearTimeout(t)
  }, [mood.id])

  useEffect(() => {
    // Cache hit: use stored line immediately
    if (lineCache.has(mood.id)) {
      setLine(lineCache.get(mood.id))
      setLoading(false)
      return
    }

    // Reset for new mood
    setLoading(true)
    setLine(null)
    setVisible(false)

    // Cancel any in-flight request from previous mood
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const useFallback = (reason) => {
      console.log(`[AIRadioLine] using local fallback (${reason})`)
      const text = FALLBACK_LINES[mood.id] ?? ''
      lineCache.set(mood.id, text)
      setLine(text)
      setLoading(false)
      setTimeout(() => setVisible(true), 80)
    }

    fetch('/api/ai-radio', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mood: mood.id, timeOfDay: getTimeOfDay() }),
      signal:  ctrl.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`http_${r.status}`)
        return r.json()
      })
      .then(data => {
        const text = data?.text?.trim()
        if (!text) throw new Error('empty_text')
        lineCache.set(mood.id, text)
        setLine(text)
        setLoading(false)
        setTimeout(() => setVisible(true), 80)
      })
      .catch(err => {
        if (err?.name === 'AbortError') return   // mood changed, ignore
        useFallback(err.message)
      })

    return () => ctrl.abort()
  }, [mood.id])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`air ${visible ? 'air--in' : ''}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {loading ? (
        <span className="air__loading">电台正在想今晚的话…</span>
      ) : line ? (
        <span className="air__text">「{line}」</span>
      ) : null}
    </div>
  )
}
