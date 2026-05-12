// Vercel Serverless Function — runs on Node.js, never in the browser.
// API keys are accessed via process.env inside api/lib/aiProvider.js.

import { getFallbackLine, runAIProvider } from './lib/aiProvider.js'

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

function buildUserMessage(mood, timeOfDay) {
  return timeOfDay
    ? `听众现在的心情是「${mood}」，时间是${timeOfDay}。请用一两句话为这段心情做电台开场白。`
    : `听众现在的心情是「${mood}」。请用一两句话为这段心情做电台开场白。`
}

function normalizeRadioLine(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  return text ? { text } : null
}

function localFallback(mood) {
  return {
    text: getFallbackLine(mood),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const body = req.body ?? {}
  const mood = typeof body.mood === 'string' ? body.mood.slice(0, 20) : null
  const time = typeof body.timeOfDay === 'string' ? body.timeOfDay.slice(0, 10) : null

  if (!mood) {
    return res.status(400).json({ error: 'missing_mood' })
  }

  const result = await runAIProvider({
    logLabel:             'ai-radio',
    logValue:             `mood="${mood}"`,
    systemPrompt:         SYSTEM_PROMPT,
    userMessage:          buildUserMessage(mood, time),
    maxTokens:            150,
    deepSeekTemperature:  0.92,
    timeoutMs:            7000,
    normalize:            normalizeRadioLine,
    localFallback:        () => localFallback(mood),
  })

  return res.status(200).json(result)
}
