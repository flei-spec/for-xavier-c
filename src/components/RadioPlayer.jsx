import { useEffect, useRef } from 'react'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import './RadioPlayer.css'

function fmt(s) {
  if (!s || isNaN(s)) return '--:--'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// Pure display + controls — all audio logic lives in AudioPlayerContext.
// This component reads state from the context and calls context methods.
// It never touches the audio element directly, and never pauses audio on unmount.
export default function RadioPlayer({ mood, introPhase }) {
  const {
    currentSong, isPlaying, currentTime, duration,
    pause, resumePlay, startAfterIntro, nextSong, prevSong, seek,
  } = useAudioPlayer()

  // When the voice intro ends, tell the context to start playback.
  // mountedWithIntro guards against spurious startAfterIntro() calls: the
  // transition 'playing' → 'ready' can only legitimately fire if this
  // RadioPlayer instance actually mounted while the intro was playing.
  const mountedWithIntro = useRef(introPhase === 'playing')
  const prevPhase = useRef(introPhase)
  useEffect(() => {
    if (!mountedWithIntro.current) return
    if (prevPhase.current === 'playing' && introPhase === 'ready') {
      startAfterIntro()
    }
    prevPhase.current = introPhase
  }, [introPhase, startAfterIntro])

  const toggle = () => isPlaying ? pause() : resumePlay()

  const handleSeek = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }

  const introPlaying = introPhase === 'playing'
  const progress     = duration ? Math.min((currentTime / duration) * 100, 100) : 0

  const displayTitle  = currentSong?.title         || ''
  const displayArtist = currentSong?.artist        || null
  const displayReason = currentSong?.romanticReason || null

  const statusText = introPlaying
    ? 'Xavier.C 的语音电台开场中…'
    : isPlaying ? '正在播放' : '点击播放'

  const pulseColor = introPlaying
    ? mood.accentColor
    : isPlaying ? '#4caf50' : 'rgba(255,255,255,0.2)'

  return (
    <div className="player" style={{ '--accent': mood.accentColor }}>
      <div className="player__top-bar" />

      <p className="player__now">
        <span
          className={`player__pulse ${introPlaying ? 'player__pulse--intro' : ''}`}
          style={{ background: pulseColor }}
        />
        {statusText}
      </p>

      <div className="player__track">
        <div className="player__art">
          <span className="player__art-icon">
            {introPlaying ? '🎙️' : mood.icon}
          </span>
          {(isPlaying && !introPlaying) && (
            <div className="player__wave">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="player__bar" style={{ '--d': `${i * 0.13}s` }} />
              ))}
            </div>
          )}
          {introPlaying && (
            <div className="player__wave">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="player__bar player__bar--intro" style={{ '--d': `${i * 0.18}s` }} />
              ))}
            </div>
          )}
        </div>

        <div className="player__meta">
          <h3 className="player__title">{displayTitle}</h3>
          {displayArtist && <p className="player__artist">{displayArtist}</p>}
          {displayReason && !introPlaying && (
            <p className="player__reason">「{displayReason}」</p>
          )}
          {introPlaying && (
            <p className="player__reason player__reason--intro">
              「正在播放你的专属开场语音…」
            </p>
          )}
        </div>
      </div>

      <div className="player__progress-row">
        <span className="player__time">{introPlaying ? '--:--' : fmt(currentTime)}</span>
        <div
          className="player__track-bar"
          onClick={introPlaying ? undefined : handleSeek}
          style={{ cursor: introPlaying ? 'default' : 'pointer' }}
        >
          <div
            className="player__fill"
            style={{ width: `${introPlaying ? 0 : progress}%`, background: mood.accentColor }}
          />
        </div>
        <span className="player__time">{introPlaying ? '--:--' : fmt(duration)}</span>
      </div>

      <div className="player__controls">
        <button
          className="player__skip"
          onClick={introPlaying ? undefined : prevSong}
          style={{ opacity: introPlaying ? 0.3 : 1, cursor: introPlaying ? 'default' : 'pointer' }}
          title="上一首"
        >⏮</button>

        <button
          className={`player__play ${introPlaying ? 'player__play--intro' : ''}`}
          onClick={introPlaying ? undefined : toggle}
          style={{ cursor: introPlaying ? 'default' : 'pointer' }}
          aria-label={introPlaying ? '语音开场中' : (isPlaying ? '暂停' : '播放')}
        >
          {introPlaying ? '🎙️' : isPlaying ? '⏸' : '▶'}
        </button>

        <button
          className="player__skip"
          onClick={introPlaying ? undefined : nextSong}
          style={{ opacity: introPlaying ? 0.3 : 1, cursor: introPlaying ? 'default' : 'pointer' }}
          title="下一首"
        >⏭</button>
      </div>
    </div>
  )
}
