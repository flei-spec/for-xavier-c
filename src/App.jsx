import { useState, useEffect } from 'react'
import { moods } from './data/romanticProfile'
import { useAtmosphere } from './hooks/useAtmosphere'
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

  // Apply dynamic atmosphere theme to <html>
  useEffect(() => {
    const theme = atmosphere?.theme ?? 'default'
    document.documentElement.setAttribute('data-atm', theme)
    return () => document.documentElement.removeAttribute('data-atm')
  }, [atmosphere?.theme])

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
