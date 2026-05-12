// Shared server-side AI provider chain.
// This file is imported only by Vercel API routes; never import it from src/.

export { FALLBACK_LINES, getFallbackLine } from '../../src/utils/aiFallback.js'

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

// Safely extracts JSON from LLM output that may include markdown code fences.
export function parseJSON(raw) {
  if (!raw) return null
  const s = raw.trim()
  try { return JSON.parse(s) } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) { try { return JSON.parse(fenced[1].trim()) } catch {} }
  const obj = s.match(/\{[\s\S]*\}/)
  if (obj) { try { return JSON.parse(obj[0]) } catch {} }
  return null
}

async function requestClaude({ systemPrompt, userMessage, maxTokens }) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('no anthropic key')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta':    'prompt-caching-2024-07-31',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) throw new Error(`claude_http_${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text
}

async function requestDeepSeek({
  systemPrompt,
  userMessage,
  maxTokens,
  temperature,
  responseFormat,
}) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('no deepseek key')

  const body = {
    model:       'deepseek-chat',
    max_tokens:  maxTokens,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ],
  }

  if (responseFormat) body.response_format = responseFormat

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`deepseek_http_${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content
}

function ensureResult(result, provider) {
  if (!result) throw new Error(`${provider}_empty_response`)
  return { ...result, provider }
}

function formatLogValue(logValue, result) {
  return typeof logValue === 'function' ? logValue(result) : logValue
}

export async function runAIProvider({
  logLabel,
  logValue,
  systemPrompt,
  userMessage,
  maxTokens,
  deepSeekTemperature,
  deepSeekResponseFormat = null,
  timeoutMs,
  normalize,
  localFallback,
}) {
  try {
    const raw = await withTimeout(
      requestClaude({ systemPrompt, userMessage, maxTokens }),
      timeoutMs,
    )
    const result = ensureResult(normalize(raw, 'claude'), 'claude')
    console.log('[AI PROVIDER]', 'claude')
    console.log(`[${logLabel}] provider=claude ${formatLogValue(logValue, result)}`)
    return result
  } catch (err) {
    console.warn(`[${logLabel}] claude failed: ${err.message}`)
  }

  try {
    const raw = await withTimeout(
      requestDeepSeek({
        systemPrompt,
        userMessage,
        maxTokens,
        temperature: deepSeekTemperature,
        responseFormat: deepSeekResponseFormat,
      }),
      timeoutMs,
    )
    const result = ensureResult(normalize(raw, 'deepseek'), 'deepseek')
    console.log('[AI PROVIDER]', 'deepseek')
    console.log(`[${logLabel}] provider=deepseek ${formatLogValue(logValue, result)}`)
    return result
  } catch (err) {
    console.warn(`[${logLabel}] deepseek failed: ${err.message}`)
  }

  const result = ensureResult(localFallback(), 'local')
  console.log('[AI PROVIDER]', 'local')
  console.log(`[${logLabel}] provider=local ${formatLogValue(logValue, result)}`)
  return result
}
