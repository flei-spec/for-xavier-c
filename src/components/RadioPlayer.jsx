import { useState, useEffect, useRef } from 'react'
import './RadioPlayer.css'

// ── Audio fade utility ────────────────────────────────────────────────────────
function fadeVolume(audio, from, to, ms) {
  return new Promise(resolve => {
    const start = performance.now()
    audio.volume = Math.max(0, Math.min(1, from))
    const step = () => {
      const t = Math.min((performance.now() - start) / ms, 1)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * eased))
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RadioPlayer({
  mood, song, onNext, onPrev,
  introPhase, onSongError,
  autoStart = false,  // if true, first song autoplays without waiting for intro
}) {
  const [playing, setPlaying]   = useState(false)
  const [elapsed, setElapsed]   = useState(0)
  const [realDur, setRealDur]   = useState(0)

  const audioRef       = useRef(null)
  const prevPhase      = useRef(introPhase)
  const isSwitching    = useRef(false)
  // Refs to avoid stale-closure issues inside effects
  const playingRef     = useRef(false)
  const introPhaseRef  = useRef(introPhase)
  // Set true by handleEnded before calling onNext() so the next src change autoplays.
  // Seeded from autoStart prop so the very first song plays when intro is skipped.
  const autoplayNext   = useRef(autoStart)

  const activeSrc = song?.src

  // Keep refs in sync with live state / props
  useEffect(() => { playingRef.current    = playing    }, [playing])
  useEffect(() => { introPhaseRef.current = introPhase }, [introPhase])

  // ── Source change: load + conditionally autoplay ───────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Capture intent before the async gap resets refs
    const shouldAutoplay = autoplayNext.current || playingRef.current
    autoplayNext.current = false

    console.log(
      '[RadioPlayer] Track source →', activeSrc || '(none)',
      '| shouldAutoplay:', shouldAutoplay,
      '| introPhase:', introPhaseRef.current,
    )

    const switchTrack = async () => {
      if (isSwitching.current) return
      isSwitching.current = true

      // Fade out current playback
      if (!audio.paused && audio.volume > 0) {
        await fadeVolume(audio, audio.volume, 0, 300)
      }
      audio.pause()
      audio.load()
      setPlaying(false)
      setElapsed(0)
      setRealDur(0)
      isSwitching.current = false

      // Autoplay if: was playing before switch OR song ended naturally
      // Skip autoplay while the voice intro is still playing
      if (shouldAutoplay && introPhaseRef.current !== 'playing') {
        console.log('[RadioPlayer] Autoplaying next song:', activeSrc)
        audio.volume = 0
        try {
          await audio.play()
          console.log('[RadioPlayer] ▶ Song playback started:', activeSrc)
          await fadeVolume(audio, 0, 0.88, 700)
        } catch (err) {
          console.error('[RadioPlayer] Autoplay blocked:', err.name, err.message, '| src:', activeSrc)
          onSongError?.('自动播放被阻止，请点击 ▶ 继续')
        }
      }
    }

    switchTrack()
  // activeSrc is the only real dependency — playing/introPhase are read via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc])

  // ── Auto-play when voice intro ends ───────────────────────────────────────
  useEffect(() => {
    if (prevPhase.current === 'playing' && introPhase === 'ready') {
      const audio = audioRef.current
      if (!audio) return
      const t = setTimeout(async () => {
        console.log('[RadioPlayer] Voice intro ended → starting song:', activeSrc)
        audio.volume = 0
        try {
          await audio.play()
          console.log('[RadioPlayer] ▶ Song playing after intro:', activeSrc)
          await fadeVolume(audio, 0, 0.88, 900)
        } catch (err) {
          console.error('[RadioPlayer] play() failed after intro:', err.name, err.message)
          onSongError?.(`播放失败：${err.message}`)
        }
      }, 150)
      return () => clearTimeout(t)
    }
    prevPhase.current = introPhase
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introPhase])

  // ── Playback events ────────────────────────────────────────────────────────
  const handleEnded = () => {
    console.log('[RadioPlayer] Song ended:', activeSrc)
    setPlaying(false)
    setElapsed(0)
    // Signal that the next src change should autoplay
    autoplayNext.current = true
    console.log('[RadioPlayer] Advancing to next song...')
    onNext()
  }

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      await fadeVolume(audio, audio.volume, 0, 400)
      audio.pause()
    } else {
      audio.volume = 0
      audio.play().catch(err => {
        console.error('[RadioPlayer] play() failed in toggle:', err.name, err.message, '| src:', activeSrc)
        onSongError?.(`播放失败：${err.message}`)
      })
      fadeVolume(audio, 0, 0.88, 700)
    }
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '--:--'
    const m   = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const introPlaying = introPhase === 'playing'
  const total        = realDur || 1
  const progress     = Math.min((elapsed / total) * 100, 100)

  const displayTitle  = song?.title  || ''
  const displayArtist = song?.artist || null
  const displayReason = song?.reason || null

  const statusText = introPlaying
    ? 'Xavier.C 的语音电台开场中…'
    : playing ? '正在播放' : '点击播放'

  const pulseColor = introPlaying
    ? mood.accentColor
    : playing ? '#4caf50' : 'rgba(255,255,255,0.2)'

  return (
    <div className="player" style={{ '--accent': mood.accentColor }}>
      <div className="player__top-bar" />

      {activeSrc && (
        <audio
          ref={audioRef}
          src={activeSrc}
          crossOrigin="anonymous"
          preload="metadata"
          onPlay={() => {
            console.log('[RadioPlayer] onPlay fired:', activeSrc)
            setPlaying(true)
          }}
          onPause={() => setPlaying(false)}
          onEnded={handleEnded}
          onLoadedMetadata={e => setRealDur(e.target.duration)}
          onTimeUpdate={e => setElapsed(e.target.currentTime)}
          onError={e => {
            const err = e.target.error
            const msg = `code ${err?.code} — ${err?.message ?? 'unknown'}`
            console.error('[RadioPlayer] Audio load error:', msg, '| src:', activeSrc)
            onSongError?.(`无法加载：${activeSrc?.split('/').pop() ?? ''} (${msg})`)
          }}
        />
      )}

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
          {(playing && !introPlaying) && (
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
        <span className="player__time">{introPlaying ? '--:--' : fmt(elapsed)}</span>
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
        <span className="player__time">{introPlaying ? '--:--' : fmt(realDur)}</span>
      </div>

      <div className="player__controls">
        <button
          className="player__skip"
          onClick={introPlaying ? undefined : onPrev}
          style={{ opacity: introPlaying ? 0.3 : 1, cursor: introPlaying ? 'default' : 'pointer' }}
          title="上一首"
        >⏮</button>

        <button
          className={`player__play ${introPlaying ? 'player__play--intro' : ''}`}
          onClick={introPlaying ? undefined : toggle}
          style={{ cursor: introPlaying ? 'default' : 'pointer' }}
          aria-label={introPlaying ? '语音开场中' : (playing ? '暂停' : '播放')}
        >
          {introPlaying ? '🎙️' : playing ? '⏸' : '▶'}
        </button>

        <button
          className="player__skip"
          onClick={introPlaying ? undefined : onNext}
          style={{ opacity: introPlaying ? 0.3 : 1, cursor: introPlaying ? 'default' : 'pointer' }}
          title="下一首"
        >⏭</button>
      </div>
    </div>
  )
}
