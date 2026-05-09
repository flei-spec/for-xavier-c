import { useState, useEffect } from 'react'
import { getTimePeriod, getAtmosphereTheme, generateAtmosphereMessage } from '../utils/atmosphere'
import { fetchWeather } from '../utils/weather'

// ── Geolocation ───────────────────────────────────────────────────────────────
//
// Returns { lat, lon } on success, or null when the user denies permission
// or the browser has no geolocation support.
//
// A null result signals "time-only mode" to load() — no weather is fetched,
// and the background theme falls back to the time-of-day gradient only.
//
// Previous behaviour: resolve to San Francisco on denial.
// New behaviour: resolve to null so the caller can skip the weather API call.

async function getCoords() {
  if (!navigator.geolocation) return null

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve(null),   // denied or unavailable → time-only fallback
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    )
  })
}

// ── Reverse geocoding ─────────────────────────────────────────────────────────
// Free, no API key.  Returns a city name string or null on failure.
async function getCity(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lon}&localityLanguage=zh`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const d   = await res.json()
    const raw = d.city || d.locality || d.principalSubdivision || null
    return raw ? raw.replace(/[市省区县自治州]$/, '') : null
  } catch {
    return null
  }
}

// ── Time-only state builder ───────────────────────────────────────────────────
// Used when: location denied, geolocation unavailable, or weather API down.
function buildTimeOnlyData() {
  const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone
  const nowStr = new Date().toLocaleString('en-US', { timeZone: tz })
  const now    = new Date(nowStr)
  const hour   = now.getHours()
  const minute = now.getMinutes()

  const period  = getTimePeriod(hour)
  const theme   = getAtmosphereTheme({ weatherType: null, period, temp: null })
  const message = generateAtmosphereMessage({ weatherType: null, period, temp: null, city: null })

  return {
    city:     null,
    temp:     null,
    weather:  null,   // null signals "no weather data" to App.jsx and LocalAtmosphereCard
    period,
    hour,
    minute,
    theme,
    message,
    timezone: tz,
    locationDenied: true,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAtmosphere() {
  const [state, setState] = useState({ loading: true, data: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      // 1. Ask for location permission.
      const coords = await getCoords()

      if (cancelled) return

      // 2. Location denied or unavailable → time-only mode.
      if (!coords) {
        setState({ loading: false, data: buildTimeOnlyData() })
        return
      }

      // 3. Location granted → fetch city name + weather in parallel.
      const { lat, lon } = coords
      try {
        const [city, w] = await Promise.all([
          getCity(lat, lon),
          fetchWeather(lat, lon),
          // ── WEATHER API HOOK POINT ────────────────────────────────────────
          // fetchWeather() in src/utils/weather.js automatically selects:
          //   • OpenWeatherMap if VITE_OPENWEATHER_KEY is set in .env.local
          //   • Open-Meteo otherwise (free, no key, default)
          //
          // To add WeatherAPI.com, Pirateweather, or any other provider:
          //   1. Add a fetchFromXxx() function in src/utils/weather.js
          //   2. Add the corresponding VITE_XXX_KEY to .env.local
          //   3. Update the provider-selection block in fetchWeather()
          // ─────────────────────────────────────────────────────────────────
        ])

        if (cancelled) return

        // 4. Derive atmosphere state from weather + time.
        const { type: weatherType, label, icon, temp, timezone } = w

        const nowStr  = new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' })
        const now     = new Date(nowStr)
        const hour    = now.getHours()
        const minute  = now.getMinutes()

        const period  = getTimePeriod(hour)
        const theme   = getAtmosphereTheme({ weatherType, period, temp })
        const message = generateAtmosphereMessage({ weatherType, period, temp, city })

        setState({
          loading: false,
          data: {
            city,
            temp,
            weather: { type: weatherType, label, icon },
            period,
            hour,
            minute,
            theme,
            message,
            timezone,
            locationDenied: false,
          },
        })
      } catch {
        // Weather fetch failed (network error, API down, etc.)
        // Fall back to time-only mode rather than showing nothing.
        if (!cancelled) setState({ loading: false, data: buildTimeOnlyData() })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}
