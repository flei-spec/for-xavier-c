// Vercel Serverless Function — runs on Node.js, never in the browser.
// API keys are accessed via process.env and never exposed to the client.

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

// System prompt defining the radio host persona.
// Cached on Claude via prompt-caching-2024-07-31 so repeated calls are cheaper.
const SYSTEM_PROMPT = `你是 StayWithXavier 的深夜电台主播，负责在每个心情歌单开始时说一句开场白。

规则：
- 只说1到3句话，不要更多
- 用中文，简洁，有温度，有画面感
- 像深夜电台真实的主播，绝对不像AI助手
- 语气轻柔，不分析情绪，不给建议，不治愈
- 可以有一点点诗意，但不矫情
- 不要引用歌名，不要提到具体的人名
- 让听的人感觉被理解、被陪伴`

// ── Helpers ───────────────────────────────────────────────────────────────────

function localFallback(mood) {
  return {
    text:     FALLBACK_LINES[mood] ?? '今晚就这样慢慢听吧。',
    provider: 'local',
  }
}

// Races a promise against a timeout. Throws on timeout.
function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

function buildUserMessage(mood, timeOfDay) {
  return timeOfDay
    ? `听众现在的心情是「${mood}」，时间是${timeOfDay}。请用一两句话为这段心情做电台开场白。`
    : `听众现在的心情是「${mood}」。请用一两句话为这段心情做电台开场白。`
}

// ── Provider: Claude ──────────────────────────────────────────────────────────

async function tryClaude(mood, timeOfDay) {
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
      max_tokens: 150,
      system: [
        // cache_control marks this block for prompt caching — same prompt,
        // lower cost on repeated calls within the 5-minute TTL window.
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: buildUserMessage(mood, timeOfDay) }],
    }),
  })

  if (!res.ok) {
    // Don't surface raw error body — just the status code is enough to log
    throw new Error(`claude_http_${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text?.trim()
  if (!text) throw new Error('claude_empty_response')
  return { text, provider: 'claude' }
}

// ── Provider: DeepSeek ────────────────────────────────────────────────────────

async function tryDeepSeek(mood, timeOfDay) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('no deepseek key')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'deepseek-chat',
      max_tokens:  150,
      temperature: 0.92,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserMessage(mood, timeOfDay) },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`deepseek_http_${res.status}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('deepseek_empty_response')
  return { text, provider: 'deepseek' }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Parse and sanitize inputs
  const body   = req.body ?? {}
  const mood   = typeof body.mood      === 'string' ? body.mood.slice(0, 20)     : null
  const time   = typeof body.timeOfDay === 'string' ? body.timeOfDay.slice(0, 10) : null

  if (!mood) {
    return res.status(400).json({ error: 'missing_mood' })
  }

  const TIMEOUT_MS = 7000   // 7 s per provider before falling through

  // ── Try Claude first ────────────────────────────────────────────────────────
  try {
    const result = await withTimeout(tryClaude(mood, time), TIMEOUT_MS)
    console.log(`[ai-radio] provider=claude mood="${mood}"`)
    return res.status(200).json(result)
  } catch (err) {
    // Log the reason without leaking key material or full stack traces
    console.warn(`[ai-radio] claude failed: ${err.message}`)
  }

  // ── Try DeepSeek as fallback ────────────────────────────────────────────────
  try {
    const result = await withTimeout(tryDeepSeek(mood, time), TIMEOUT_MS)
    console.log(`[ai-radio] provider=deepseek mood="${mood}"`)
    return res.status(200).json(result)
  } catch (err) {
    console.warn(`[ai-radio] deepseek failed: ${err.message}`)
  }

  // ── Local preset as final safety net ───────────────────────────────────────
  console.log(`[ai-radio] provider=local mood="${mood}"`)
  return res.status(200).json(localFallback(mood))
}
