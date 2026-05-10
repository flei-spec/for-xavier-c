// Vercel Serverless Function — server-side only, API keys never in browser.
// Classifies free-text feelings into one of the 9 mood categories.

const VALID_MOODS = [
  '想你了', '开心开心', '今天很幸福', '需要安慰', '想被抱抱',
  '有点苦恼', '洗澡放松一下', '想一个人发呆', '今天有点累',
]

// ── Local keyword fallback ────────────────────────────────────────────────────
// Order matters: first match wins.
const KEYWORD_RULES = [
  { keywords: ['想你','想他','想她','见不到','距离','异地','念你','思念'],  mood: '想你了' },
  { keywords: ['开心','高兴','快乐','笑了','哈哈','好棒','太好了','开心'], mood: '开心开心' },
  { keywords: ['幸福','满足','甜','被爱','好爱','珍惜','暖暖'],            mood: '今天很幸福' },
  { keywords: ['难过','委屈','哭','难受','受伤','心疼','伤心'],             mood: '需要安慰' },
  { keywords: ['抱抱','抱紧','靠近','依靠','贴着','想被抱'],               mood: '想被抱抱' },
  { keywords: ['烦','苦恼','纠结','压力','焦虑','不知道怎么'],              mood: '有点苦恼' },
  { keywords: ['洗澡','放松','泡澡','卸下','冲个澡'],                       mood: '洗澡放松一下' },
  { keywords: ['发呆','空空','安静','不想说话','放空','漂着'],              mood: '想一个人发呆' },
  { keywords: ['累','疲惫','困','撑不住','好累','乏'],                      mood: '今天有点累' },
]

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

// System prompt: instructs both classification AND line generation in one call.
// Cached on Claude via prompt-caching-2024-07-31.
const SYSTEM_PROMPT = `你是 StayWithXavier 情绪电台的心情分析助手。

可选心情标签（必须且只能选其中一个）：
想你了 / 开心开心 / 今天很幸福 / 需要安慰 / 想被抱抱 / 有点苦恼 / 洗澡放松一下 / 想一个人发呆 / 今天有点累

你的任务：
1. 读懂用户描述的情绪
2. 选择最匹配的一个心情标签
3. 用1-2句温柔的中文写电台开场白（语气轻柔，不分析，不建议，像深夜电台主播）
4. 给出0到1之间的置信度

只输出纯 JSON，不要有任何其他内容、代码块或解释：
{"matchedMood":"...","emotionalLine":"...","confidence":0.0}`

// ── Helpers ───────────────────────────────────────────────────────────────────

function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

// Safely extracts JSON from LLM output that may include markdown code fences.
function parseJSON(raw) {
  if (!raw) return null
  const s = raw.trim()
  try { return JSON.parse(s) } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) { try { return JSON.parse(fenced[1].trim()) } catch {} }
  const obj = s.match(/\{[\s\S]*\}/)
  if (obj)   { try { return JSON.parse(obj[0]) } catch {} }
  return null
}

function validateResult(parsed) {
  if (!parsed) return null
  const mood = parsed.matchedMood
  const line = typeof parsed.emotionalLine === 'string' ? parsed.emotionalLine.trim() : ''
  if (!VALID_MOODS.includes(mood) || !line) return null
  return {
    matchedMood:   mood,
    emotionalLine: line,
    confidence:    typeof parsed.confidence === 'number'
                   ? Math.min(1, Math.max(0, parsed.confidence))
                   : 0.8,
  }
}

function keywordFallback(text) {
  const t = text.toLowerCase()
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(k => t.includes(k))) {
      const mood = rule.mood
      return {
        matchedMood:   mood,
        emotionalLine: FALLBACK_LINES[mood],
        confidence:    0.6,
        provider:      'local',
      }
    }
  }
  // Default when nothing matches
  return {
    matchedMood:   '想一个人发呆',
    emotionalLine: FALLBACK_LINES['想一个人发呆'],
    confidence:    0.4,
    provider:      'local',
  }
}

function buildUserMessage(text) {
  return `用户说："${text}"\n请分析心情并输出 JSON。`
}

// ── Provider: Claude ──────────────────────────────────────────────────────────

async function tryClaude(text) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('no anthropic key')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta':    'prompt-caching-2024-07-31',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 200,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: buildUserMessage(text) }],
    }),
  })

  if (!res.ok) throw new Error(`claude_http_${res.status}`)
  const data   = await res.json()
  const raw    = data.content?.[0]?.text
  const parsed = validateResult(parseJSON(raw))
  if (!parsed) throw new Error('claude_invalid_json')
  return { ...parsed, provider: 'claude' }
}

// ── Provider: DeepSeek ────────────────────────────────────────────────────────

async function tryDeepSeek(text) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('no deepseek key')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:           'deepseek-chat',
      max_tokens:      200,
      temperature:     0.7,
      response_format: { type: 'json_object' },   // forces valid JSON output
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserMessage(text) },
      ],
    }),
  })

  if (!res.ok) throw new Error(`deepseek_http_${res.status}`)
  const data   = await res.json()
  const raw    = data.choices?.[0]?.message?.content
  const parsed = validateResult(parseJSON(raw))
  if (!parsed) throw new Error('deepseek_invalid_json')
  return { ...parsed, provider: 'deepseek' }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const body = req.body ?? {}
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 200) : ''

  if (!text) {
    return res.status(400).json({ error: 'missing_text' })
  }

  const TIMEOUT_MS = 8000

  try {
    const result = await withTimeout(tryClaude(text), TIMEOUT_MS)
    console.log(`[ai-mood-match] provider=claude mood="${result.matchedMood}"`)
    return res.status(200).json(result)
  } catch (err) {
    console.warn(`[ai-mood-match] claude failed: ${err.message}`)
  }

  try {
    const result = await withTimeout(tryDeepSeek(text), TIMEOUT_MS)
    console.log(`[ai-mood-match] provider=deepseek mood="${result.matchedMood}"`)
    return res.status(200).json(result)
  } catch (err) {
    console.warn(`[ai-mood-match] deepseek failed: ${err.message}`)
  }

  const result = keywordFallback(text)
  console.log(`[ai-mood-match] provider=local mood="${result.matchedMood}"`)
  return res.status(200).json(result)
}
