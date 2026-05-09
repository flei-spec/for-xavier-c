// ─────────────────────────────────────────────────────────────────────────────
//  weather.js
//
//  Unified weather fetching with automatic provider selection:
//
//    • Open-Meteo  (default — free, no API key, no sign-up required)
//      Docs: https://open-meteo.com/en/docs
//
//    • OpenWeatherMap  (optional — set VITE_OPENWEATHER_KEY in .env.local)
//      Free tier: 60 calls/minute, 1 000 000 calls/month.
//      Get a key: https://openweathermap.org/appid
//      Note: new keys take ~2 hours to activate after sign-up.
//
//  ┌──────────────────────────────────────────────────────────────────────────┐
//  │  TO SWITCH PROVIDER                                                      │
//  │  Add to .env.local:                                                      │
//  │    VITE_OPENWEATHER_KEY=your_key_here                                    │
//  │  Leave it empty (or absent) to keep using Open-Meteo.                   │
//  └──────────────────────────────────────────────────────────────────────────┘
//
//  Both providers return the same normalized shape:
//  {
//    type:     'sunny'|'cloudy'|'fog'|'rain'|'storm'|'snow'
//    label:    human-readable Chinese string
//    icon:     weather emoji
//    temp:     number   (°C, rounded)
//    timezone: string   (IANA timezone, e.g. "Asia/Shanghai")
//  }
// ─────────────────────────────────────────────────────────────────────────────

import { getWeatherInfo } from './atmosphere'

// ── OpenWeatherMap condition-ID → our type ───────────────────────────────────
// Full condition list: https://openweathermap.org/weather-conditions
function mapOWMId(id) {
  if (id >= 200 && id <= 232) return 'storm'
  if (id >= 300 && id <= 321) return 'rain'   // drizzle counts as rain
  if (id >= 500 && id <= 531) return 'rain'
  if (id >= 600 && id <= 622) return 'snow'
  if (id >= 700 && id <= 781) return 'fog'    // mist, smoke, haze, dust, etc.
  if (id === 800)              return 'sunny'
  if (id >= 801 && id <= 804) return 'cloudy'
  return 'cloudy'
}

// Labels / icons that match atmosphere.js's getWeatherInfo() format
const OWM_META = {
  sunny:  { label: '晴天',   icon: '☀️'  },
  cloudy: { label: '多云',   icon: '⛅'  },
  fog:    { label: '有雾',   icon: '🌫️' },
  rain:   { label: '下雨',   icon: '🌧️' },
  storm:  { label: '雷雨',   icon: '⛈️'  },
  snow:   { label: '下雪',   icon: '❄️'  },
}

// ── Provider: OpenWeatherMap ─────────────────────────────────────────────────
async function fetchFromOpenWeather(lat, lon, apiKey) {
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`OpenWeatherMap HTTP ${res.status}`)

  const d    = await res.json()
  const type = mapOWMId(d.weather[0].id)
  const meta = OWM_META[type]

  // OWM gives a UTC offset in seconds (d.timezone).  We derive an IANA
  // timezone string from the browser — this is always correct because the
  // user's browser is already in their local timezone.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return { type, label: meta.label, icon: meta.icon, temp: Math.round(d.main.temp), timezone }
}

// ── Provider: Open-Meteo (default, no key) ───────────────────────────────────
async function fetchFromOpenMeteo(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code&timezone=auto`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)

  const d    = await res.json()
  const info = getWeatherInfo(d.current.weather_code)   // reuses atmosphere.js

  return {
    type:     info.type,
    label:    info.label,
    icon:     info.icon,
    temp:     Math.round(d.current.temperature_2m),
    timezone: d.timezone,   // IANA string from the API, e.g. "America/Los_Angeles"
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Fetch current weather at (lat, lon).
 *
 * Provider selection (automatic):
 *   VITE_OPENWEATHER_KEY set  →  OpenWeatherMap
 *   VITE_OPENWEATHER_KEY empty/absent  →  Open-Meteo  (default)
 *
 * Throws on network / parse failure — caller should catch.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ type, label, icon, temp, timezone }>}
 */
export async function fetchWeather(lat, lon) {
  const owmKey = import.meta.env.VITE_OPENWEATHER_KEY
  return owmKey?.trim()
    ? fetchFromOpenWeather(lat, lon, owmKey.trim())
    : fetchFromOpenMeteo(lat, lon)
}
