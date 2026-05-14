import { useState, useEffect } from 'react'
import { moods } from '../data/romanticProfile'
import { getWeeklyStats } from '../utils/moodHistory'
import { useAuth } from '../contexts/AuthContext'
import './WeeklyRecap.css'

// ── Soft template-based summaries ──────────────────────────────────────────────

const RECAP_TEMPLATES = {
  '思念_疲惫': '这周你常常停在"思念"和"疲惫"里。好像有些话还没说出口，但你也在慢慢恢复。',
  '疲惫_思念': '这周你常常停在"思念"和"疲惫"里。好像有些话还没说出口，但你也在慢慢恢复。',
  '思念_孤独': '这周你常常停在"思念"和"孤独"里。有时候一个人待着，心里却在惦记着谁。',
  '孤独_思念': '这周你常常停在"思念"和"孤独"里。有时候一个人待着，心里却在惦记着谁。',
  '疲惫_孤独': '这周你常常停在"疲惫"和"孤独"里。好像这周有点辛苦，但你也给自己留了空间。',
  '孤独_疲惫': '这周你常常停在"疲惫"和"孤独"里。好像这周有点辛苦，但你也给自己留了空间。',
  '放空_孤独': '这周你常常停在"放空"和"孤独"里。有时候什么都不想，就是最好的休息。',
  '孤独_放空': '这周你常常停在"放空"和"孤独"里。有时候什么都不想，就是最好的休息。',
  '治愈_幸福': '这周你常常停在"治愈"和"幸福"里。真好，你对自己温柔了很多。',
  '幸福_治愈': '这周你常常停在"治愈"和"幸福"里。真好，你对自己温柔了很多。',
  '委屈_疲惫': '这周你常常停在"委屈"和"疲惫"里。有些事不容易，但你已经走过来了。',
  '疲惫_委屈': '这周你常常停在"委屈"和"疲惫"里。有些事不容易，但你已经走过来了。',
  '心动_幸福': '这周你常常停在"心动"和"幸福"里。有些开心，是藏不住的。',
  '幸福_心动': '这周你常常停在"心动"和"幸福"里。有些开心，是藏不住的。',
  '懊恼_疲惫': '这周你常常停在"懊恼"和"疲惫"里。有些话没说出口，压在心上有点沉。但你已经做得够好了。',
  '疲惫_懊恼': '这周你常常停在"懊恼"和"疲惫"里。有些话没说出口，压在心上有点沉。但你已经做得够好了。',
}

const CLOSERS = [
  '下周也在这里等你。',
  '不管什么时候回来，这盏灯都亮着。',
  '下周见，好好照顾自己。',
  '这个电台一直在，你随时可以回来。',
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function getRecapSummary(topMoods) {
  if (topMoods.length === 0) return null
  if (topMoods.length === 1) {
    const m = topMoods[0].mood
    const templates = {
      '思念': '这周你常常停在"思念"里。有些人在心里，住得很深。',
      '幸福': '这周你常常停在"幸福"里。真好，这一周有值得开心的事。',
      '委屈': '这周你常常停在"委屈"里。有些事不容易，但你都撑过来了。',
      '懊恼': '这周你常常停在"懊恼"里。有些话没说出口也没关系，下周再说。',
      '治愈': '这周你常常停在"治愈"里。你给了自己很多温柔，这很重要。',
      '放空': '这周你常常停在"放空"里。给自己留了空白，挺好的。',
      '孤独': '这周你常常停在"孤独"里。一个人待着，也是一种好好陪自己。',
      '疲惫': '这周你常常停在"疲惫"里。辛苦了，你真的已经做得够好了。',
      '心动': '这周你常常停在"心动"里。那种心跳的感觉，是生活里最好的事。',
    }
    return templates[m] || `这周你常常停在"${m}"里。`
  }
  const key = topMoods.slice(0, 2).map(m => m.mood).join('_')
  return RECAP_TEMPLATES[key] || `这周你常常停在"${topMoods[0].mood}"和"${topMoods[1].mood}"里。每一种心情，都是真实的你。`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyRecap({ onClose }) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!user) return
    getWeeklyStats(user.id).then(data => {
      setStats(data)
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  const moodIcon = (moodId) => {
    const found = moods.find(m => m.id === moodId)
    return found ? found.icon : '✨'
  }

  const summary = stats ? getRecapSummary(stats.topMoods) : null

  return (
    <div
      className={`wr__overlay ${visible ? 'wr__overlay--in' : ''}`}
      onClick={dismiss}
    >
      <div className="wr__card" onClick={e => e.stopPropagation()}>
        <p className="wr__label">你的这周</p>

        {loading ? (
          <div className="wr__loading">
            <div className="wr__dots"><span /><span /><span /></div>
          </div>
        ) : !stats || stats.totalEntries === 0 ? (
          <p className="wr__empty">这周还没有记录。下周开始，每次心情都会被记得。</p>
        ) : (
          <>
            <div className="wr__moods">
              {stats.topMoods.slice(0, 3).map(({ mood, count }) => (
                <div key={mood} className="wr__mood-badge">
                  <span className="wr__mood-icon">{moodIcon(mood)}</span>
                  <span className="wr__mood-label">{mood}</span>
                  <span className="wr__mood-count">{count}次</span>
                </div>
              ))}
            </div>

            <p className="wr__count">这周你来了 <strong>{stats.totalEntries}</strong> 次</p>

            {summary && <p className="wr__summary">「{summary}」</p>}

            <p className="wr__closer">{pick(CLOSERS)}</p>
          </>
        )}

        <button className="wr__close-btn" onClick={dismiss}>知道了</button>
      </div>
    </div>
  )
}
