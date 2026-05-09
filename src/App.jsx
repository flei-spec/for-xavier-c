import { useState, useEffect } from 'react'
import { moods } from './data/romanticProfile'
import { useAtmosphere } from './hooks/useAtmosphere'
import { getTimeOfDay, getBackgroundTheme } from './utils/backgroundTheme'
import StarBackground from './components/StarBackground'
import AtmosphereParticles from './components/AtmosphereParticles'
import WelcomePage from './components/WelcomePage'
import MoodSelector from './components/MoodSelector'
import RadioStation from './components/RadioStation'
import './App.css'

export default function App() {
  const [page, setPage]               = useState('welcome')
  const [selectedMood, setSelectedMood] = useState(null)

  const { data: atmosphere } = useAtmosphere()

  // ── Apply atmosphere theme (data-atm attribute + background gradient) ──────
  useEffect(() => {
    // 1. Existing coarse theme — drives particle colours, card tints, etc.
    const theme = atmosphere?.theme ?? 'default'
    document.documentElement.setAttribute('data-atm', theme)

    // 2. Fine-grained background gradient from time + weather.
    //
    //    atmosphere.hour         = local hour (0-23) from the weather API timezone
    //    atmosphere.weather.type = 'sunny' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow'
    //
    //    MOCK: to force a specific weather for testing, replace the line below with e.g.
    //      const weatherType = 'rainy'
    const hour        = atmosphere?.hour        ?? new Date().getHours()
    const weatherType = atmosphere?.weather?.type ?? null   // null → uses time-only default

    const timeOfDay = getTimeOfDay(hour)
    const bg        = getBackgroundTheme({ timeOfDay, weather: weatherType })

    const root = document.documentElement.style
    root.setProperty('--bg-deep',    bg.bgDeep)
    root.setProperty('--atm-glow-1', bg.glow1)
    root.setProperty('--atm-glow-2', bg.glow2)

    return () => {
      document.documentElement.removeAttribute('data-atm')
      root.removeProperty('--bg-deep')
      root.removeProperty('--atm-glow-1')
      root.removeProperty('--atm-glow-2')
    }
  }, [atmosphere?.theme, atmosphere?.hour, atmosphere?.weather?.type])

  const handleEnter = () => setPage('mood')

  const handleStartStation = (mood) => {
    setSelectedMood(mood)
    localStorage.setItem('xavier_last_mood', mood.id)
    setPage('station')
  }

  const handleBack = () => setPage('mood')

  return (
    <div className="app">
      <StarBackground />
      <AtmosphereParticles theme={atmosphere?.theme} />

      {page === 'welcome' && (
        <WelcomePage onEnter={handleEnter} atmosphere={atmosphere} />
      )}
      {page === 'mood' && (
        <MoodSelector onStart={handleStartStation} atmosphere={atmosphere} />
      )}
      {page === 'station' && selectedMood && (
        <RadioStation
          mood={selectedMood}
          onBack={handleBack}
          atmosphere={atmosphere}
        />
      )}
    </div>
  )
}
