import { supabase } from '../lib/supabase'

// ── Date helpers ──────────────────────────────────────────────────────────────

function previousMonthRange() {
  const now = new Date()
  // Start of current month
  const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1)
  // Start of previous month
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { start: startPrev.toISOString(), end: startCurrent.toISOString() }
}

function monthLabel() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}年${prev.getMonth() + 1}月`
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getMonthlyStats(userId) {
  if (!userId) return null

  const { start, end } = previousMonthRange()

  const { data, error } = await supabase
    .from('mood_history')
    .select('matched_mood')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) {
    console.error('[monthlyMoodAnalysis] getMonthlyStats error:', error.message, error)
    return null
  }

  if (!data || data.length === 0) return null

  const counts = {}
  for (const row of data) {
    counts[row.matched_mood] = (counts[row.matched_mood] || 0) + 1
  }

  const topMoods = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => ({ mood, count }))

  return {
    topMoods,
    totalEntries: data.length,
    monthLabel: monthLabel(),
  }
}

export async function getMonthlyTopSongs(userId) {
  if (!userId) return []

  const { start, end } = previousMonthRange()

  const { data, error } = await supabase
    .from('mood_history')
    .select('current_track_title')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end)
    .not('current_track_title', 'is', null)

  if (error) {
    console.error('[monthlyMoodAnalysis] getMonthlyTopSongs error:', error.message, error)
    return []
  }

  if (!data || data.length === 0) return []

  const counts = {}
  for (const row of data) {
    const title = row.current_track_title
    if (title) counts[title] = (counts[title] || 0) + 1
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title, count]) => ({ title, count }))
}

// ── Poetic summary templates ─────────────────────────────────────────────────

const MONTHLY_TEMPLATES = {
  '放空_思念': '上个月的你，好像总在深夜慢慢漂着。有些思念没有真正说出口，但你还是一步一步走到了今天。',
  '思念_放空': '上个月的你，好像总在深夜慢慢漂着。有些思念没有真正说出口，但你还是一步一步走到了今天。',
  '疲惫_思念': '上个月好像有点辛苦。你在想念和疲惫之间来回走着，但每一个夜晚，你都好好地陪着自己。',
  '思念_疲惫': '上个月好像有点辛苦。你在想念和疲惫之间来回走着，但每一个夜晚，你都好好地陪着自己。',
  '孤独_放空': '上个月你常常一个人待着。不是孤独，是给自己留了一片安静。那些安静的时刻，其实很珍贵。',
  '放空_孤独': '上个月你常常一个人待着。不是孤独，是给自己留了一片安静。那些安静的时刻，其实很珍贵。',
  '疲惫_孤独': '上个月你撑得很努力。有些累没说出口，有些夜晚想一个人安静。你做得很好，真的。',
  '孤独_疲惫': '上个月你撑得很努力。有些累没说出口，有些夜晚想一个人安静。你做得很好，真的。',
  '治愈_幸福': '上个月好像温柔了很多。你学会了对自己好一点，那些暖暖的瞬间，拼成了一整月的柔软。',
  '幸福_治愈': '上个月好像温柔了很多。你学会了对自己好一点，那些暖暖的瞬间，拼成了一整月的柔软。',
  '思念_孤独': '上个月有些人在心里住得很深。想念和安静交织着，但每一个夜晚，音乐都在陪着你。',
  '孤独_思念': '上个月有些人在心里住得很深。想念和安静交织着，但每一个夜晚，音乐都在陪着你。',
  '心动_幸福': '上个月心跳轻了一些好听的瞬间。有些喜欢藏不住，有些开心不需要理由。',
  '幸福_心动': '上个月心跳轻了一些好听的瞬间。有些喜欢藏不住，有些开心不需要理由。',
  '委屈_疲惫': '上个月有些小雨落在心里。你撑着走过了不容易的时刻，那些雨，把你洗得更温柔了。',
  '疲惫_委屈': '上个月有些小雨落在心里。你撑着走过了不容易的时刻，那些雨，把你洗得更温柔了。',
  '懊恼_疲惫': '上个月有些话堵在心里没说出口。但你还是好好地走到了今天，这已经很了不起了。',
  '疲惫_懊恼': '上个月有些话堵在心里没说出口。但你还是好好地走到了今天，这已经很了不起了。',
  '治愈_放空': '上个月你给自己留了很多空白。不是懒，是知道什么时候该停下来。那些空白，其实是给自己的温柔。',
  '放空_治愈': '上个月你给自己留了很多空白。不是懒，是知道什么时候该停下来。那些空白，其实是给自己的温柔。',
}

const SINGLE_MOOD_TEMPLATES = {
  '思念': '上个月，思念像一条安静的河，慢慢流过了每一天。有些人不在身边，却在心里住了整整一个月。',
  '幸福': '上个月有很多值得记住的好日子。那些幸福的时刻，像光一样，点亮了一整个月。',
  '委屈': '上个月心里下了几场小雨。有些事不容易，但雨会停的。而你，已经走到了新的月份。',
  '懊恼': '上个月有些话卡在心里没说出口。但没关系的，新的月份是新的开始。',
  '治愈': '上个月你给了自己很多温柔。那些慢下来的时刻，是你在好好地陪着自己。',
  '放空': '上个月你常常什么都不想。那些放空的时刻，不是逃避，是给自己留了一片安静的海。',
  '孤独': '上个月你常常一个人待着。那些独处的夜晚，其实是你和自己在好好相处。',
  '疲惫': '上个月你真的辛苦了。每一个"累了"的时刻，都是你在努力活着的证据。你已经做得够好了。',
  '心动': '上个月心跳轻轻跳了几下。那些藏不住的喜欢，是生活里最珍贵的小秘密。',
}

const CLOSERS = [
  '新的一个月开始了。不急，慢慢来。',
  '这个电台一直在。下个月也是。',
  '愿新的月份，温柔待你。',
  '无论上个月怎样，今天都是新的。',
  '谢谢你让这个电台陪你。下个月见。',
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

export function generateMonthlyLetter(stats, topSongs) {
  if (!stats || stats.totalEntries === 0) return null

  const { topMoods, totalEntries, monthLabel } = stats

  // Poetic summary
  let summary = ''
  if (topMoods.length === 1) {
    summary = SINGLE_MOOD_TEMPLATES[topMoods[0].mood] || `上个月你常常停在"${topMoods[0].mood}"里。`
  } else {
    const key = topMoods.slice(0, 2).map(m => m.mood).join('_')
    summary = MONTHLY_TEMPLATES[key] || `上个月你常常在"${topMoods[0].mood}"和"${topMoods[1].mood}"之间来回。每一种心情，都是真实的你。`
  }

  return {
    monthLabel,
    summary,
    topMoods,
    totalEntries,
    topSongs: topSongs || [],
    closer: pick(CLOSERS),
  }
}
