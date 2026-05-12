// Vercel Serverless Function — server-side only, API keys never in browser.
// Classifies free-text feelings into one of the 9 mood categories.

import { getFallbackLine, parseJSON, runAIProvider } from './lib/aiProvider.js'

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

// System prompt: instructs both classification AND line generation in one call.
// Cached on Claude via prompt-caching-2024-07-31.
const SYSTEM_PROMPT = `你是 StayWithXavier 的深夜电台主播。

这个电台只为一个特定的人而存在。听众对你很信任，会用很简短的话告诉你此刻的心情。你的回应需要让ta感觉——你真的听懂了ta刚才说的那句话。

你的任务：
1. 读懂用户描述的情绪
2. 从下面的心情标签中选择最匹配的一个：
   想你了 / 开心开心 / 今天很幸福 / 需要安慰 / 想被抱抱 / 有点苦恼 / 洗澡放松一下 / 想一个人发呆 / 今天有点累
3. 用 1–2 句话回应ta。你的回应必须直接呼应ta刚才说的具体内容，让ta觉得你不是在套模板，而是真的在听ta说话。
4. 给出 0 到 1 之间的置信度

回应规则（非常重要）：
- 如果你在回应里用到了和用户原话相同的关键意象或场景，那会更好
- 语气像深夜电台主播：轻柔、有温度、不分析情绪、不给建议、不治愈、不鸡汤、不加油
- 可以有一点点诗意，但不能矫情
- 句子结构要有变化，不要每次都用"今晚…"或"有时候…"开头
- 像一个很了解ta的人，安静地陪在旁边轻声回应
- 绝对不要像 AI 助手、客服、心理咨询师或搜索引擎

好与不好的例子：

用户说"今天有点想他"
✓「有些人不在身边的时候，夜晚会变得特别长。」
✗「思念是一种很自然的情感，没关系。」

用户说"不想上班"
✓「那今晚先别逼自己了，偷偷躲进歌里一会儿。」
✗「工作压力是正常的，相信你可以调整好心态。」

用户说"今天终于见到她了"
✓「有些开心，连空气都会变轻一点。」
✗「为你感到高兴，珍惜美好的时刻。」

用户说"最近压力好大"
✓「有时候不是不想努力，只是真的有点累了。」
✗「压力是生活的一部分，学会放松很重要。」

用户说"今天下雨了"
✓「雨把整个城市的声音都变软了，很适合什么都不做。」
✗「下雨天适合听歌。」

用户说"睡不着"
✓「睡不着的时候，时间好像走得特别慢。」
✗「失眠可以试试听轻音乐和深呼吸。」

用户说"今天特别开心"
✓「今天真好啊，连耳机里的歌都在笑。」
✗「开心就好，保持这样的心态。」

只输出纯 JSON，不要有任何其他内容、代码块或解释：
{"matchedMood":"...","emotionalLine":"...","confidence":0.0}`

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

function normalizeMoodMatch(raw) {
  return validateResult(parseJSON(raw))
}

function keywordFallback(text) {
  const t = text.toLowerCase()
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(k => t.includes(k))) {
      const mood = rule.mood
      return {
        matchedMood:   mood,
        emotionalLine: getFallbackLine(mood),
        confidence:    0.6,
      }
    }
  }
  // Default when nothing matches
  return {
    matchedMood:   '想一个人发呆',
    emotionalLine: getFallbackLine('想一个人发呆'),
    confidence:    0.4,
  }
}

function buildUserMessage(text) {
  return `听众刚刚对电台说："${text}"\n\n请感受ta此刻的心情，选一个心情标签，然后用 1–2 句话轻声回应ta。记住：你的回应要让ta觉得你真的听懂了ta说的内容。`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const body = req.body ?? {}
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 200) : ''

  if (!text) {
    return res.status(400).json({ error: 'missing_text' })
  }

  const result = await runAIProvider({
    logLabel:              'ai-mood-match',
    logValue:              result => `mood="${result.matchedMood}"`,
    systemPrompt:          SYSTEM_PROMPT,
    userMessage:           buildUserMessage(text),
    maxTokens:             256,
    deepSeekTemperature:   0.88,
    deepSeekResponseFormat: { type: 'json_object' },
    timeoutMs:             8000,
    normalize:             normalizeMoodMatch,
    localFallback:         () => keywordFallback(text),
  })

  return res.status(200).json(result)
}
