import { useState, useEffect } from 'react'
import { getWeatherInfo, getTimePeriod, getAtmosphereTheme, generateAtmosphereMessage } from '../utils/atmosphere'

const FALLBACK_COORDS = { lat: 37.7749, lon: -122.4194 }

async function getCoords() {
  if (!navigator.geolocation) return FALLBACK_COORDS
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(FALLBACK_COORDS),
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    )
  })
}

async function getCity(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const d = await res.json()
    const raw = d.city || d.locality || d.principalSubdivision || null
    // Strip trailing 市/省/区/县
    return raw ? raw.replace(/[市省区县自治州]$/, '') : null
  } catch {
    return null
  }
}

async function getWeather(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error('weather failed')
  return res.json()
}

export function useAtmosphere() {
  const [state, setState] = useState({ loading: true, data: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { lat, lon } = await getCoords()

        // Fetch city name and weather in parallel
        const [city, weatherJson] = await Promise.all([
          getCity(lat, lon),
          getWeather(lat, lon),
        ])

        if (cancelled) return

        const temp     = Math.round(weatherJson.current.temperature_2m)
        const code     = weatherJson.current.weather_code
        const timezone = weatherJson.timezone

        // Local time in user's timezone
        const nowStr  = new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' })
        const now     = new Date(nowStr)
        const hour    = now.getHours()
        const minute  = now.getMinutes()

        const weather = getWeatherInfo(code)
        const period  = getTimePeriod(hour)
        const theme   = getAtmosphereTheme({ weatherType: weather.type, period, temp })
        const message = generateAtmosphereMessage({ weatherType: weather.type, period, temp, city })

        setState({
          loading: false,
          data: { city, temp, weather, period, hour, minute, theme, message, timezone },
        })
      } catch {
        if (!cancelled) setState({ loading: false, data: null })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}
