import { useState, useEffect } from 'react'
import { PERIOD_LABELS, getTimePeriod } from '../utils/atmosphere'
import './LocalAtmosphereCard.css'

function pad(n) { return String(n).padStart(2, '0') }

function LiveClock({ timezone }) {
  const [time, setTime] = useState(() => {
    const str = new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' })
    const d = new Date(str)
    return { h: d.getHours(), m: d.getMinutes() }
  })

  useEffect(() => {
    const tick = () => {
      const str = new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' })
      const d = new Date(str)
      setTime({ h: d.getHours(), m: d.getMinutes() })
    }
    // sync to next minute boundary
    const now   = new Date()
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    const t1    = setTimeout(() => {
      tick()
      const iv = setInterval(tick, 60_000)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t1)
  }, [timezone])

  const period = getTimePeriod(time.h)
  return (
    <span className="atm__time">
      {PERIOD_LABELS[period]} {pad(time.h)}:{pad(time.m)}
    </span>
  )
}

export default function LocalAtmosphereCard({ atmosphere, compact = false }) {
  if (!atmosphere) {
    // Skeleton while loading
    return (
      <div className={`atm atm--skeleton ${compact ? 'atm--compact' : ''}`}>
        <div className="atm__skeleton-line atm__skeleton-line--short" />
        <div className="atm__skeleton-line atm__skeleton-line--long" />
      </div>
    )
  }

  const { city, temp, weather, message, timezone } = atmosphere

  // weather / temp are null when location was denied or the API is unavailable.
  const hasWeather = weather !== null && temp !== null

  return (
    <div className={`atm ${compact ? 'atm--compact' : ''}`}>
      <div className="atm__top">
        <span className="atm__location">
          {hasWeather && <span className="atm__icon">{weather.icon}</span>}
          {city && <>{city}{hasWeather ? ' · ' : ''}</>}
          {hasWeather ? `${temp}°C · ${weather.label}` : '时间模式'}
        </span>
        <LiveClock timezone={timezone} />
      </div>
      <p className="atm__message">「{message}」</p>
    </div>
  )
}
