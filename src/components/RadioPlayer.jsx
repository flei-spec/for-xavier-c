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

// ── Error classification ──────────────────────────────────────────────────────
//
// Two completely separate failure states:
//
//   AUTOPLAY BLOCKED — Safari / browser policy prevents auto-start.
//     Cause:  play() Promise rejects with NotAllowedError.
//     Action: show "点击播放" button.  Song is fine; never call onSongError.
//
//   FILE ERROR — the audio resource is genuinely broken or missing.
//     Cause:  <audio> onError fires with MediaError code 2 / 3 / 4.
//     Action: call onSongError → skip to next, mark src invalid.
//
// Ignored / harmless errors (never propagate to onSongError):
//   • MediaError code 1  (MEDIA_ERR_ABORTED)  — browser aborted its own fetch,
//       typically triggered when audio.load() resets the element while
//       preload="metadata" was still running. Safe to ignore.
//   • AbortError from play() — play() was interrupted by a subsequent pause()
//       or load() call (e.g. React Strict Mode double-invoke). Not a failure.

function isRealFileError(mediaError) {
  if (!mediaError) return false
  // code 2 = MEDIA_ERR_NETWORK, 3 = MEDIA_ERR_DECODE, 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
  return mediaError.code === 2 || mediaError.code === 3 || mediaError.code === 4
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RadioPlayer({
  mood, song, onNext, onPrev,
  introPhase, onSongError,
  autoStart = false,
}) {
  const [playing,         setPlaying]         = useState(false)
  const [elapsed,         setElapsed]         = useState(0)
  const [realDur,         setRealDur]         = useState(0)
  const [needsManualPlay, setNeedsManualPlay] = useState(false)

  const audioRef      = useRef(null)
  const prevPhase     = useRef(introPhase)
  const isSwitching   = useRef(false)
  const playingRef    = useRef(false)
  const introPhaseRef = useRef(introPhase)
  // Seeded from autoStart so the first song autoplays when the intro is skipped.
  const autoplayNext  = useRef(autoStart)

  const activeSrc = song?.src

  useEffect(() => { playingRef.current    = playing    }, [playing])
  useEffect(() => { introPhaseRef.current = introPhase }, [introPhase])

  // ── Attempt play() — handles both blocked-autoplay and interruptions ────────
  async function tryPlay(audio, src, fadeMs = 700) {
    audio.volume = 0
    try {
      await audio.play()
      console.log('[RadioPlayer] ▶ playing:', src)
      setNeedsManualPlay(false)
      await fadeVolume(audio, 0, 0.88, fadeMs)
    } catch (err) {
      console.log('[RadioPlayer] play blocked:', err.name, err.message, '| src:', src)
      if (err.name === 'NotAllowedError') {
        // Browser policy — show tap-to-play button, do NOT treat as file error
        console.log('[RadioPlayer] needs manual play:', true)
        setNeedsManualPlay(true)
      } else if (err.name === 'AbortError') {
        // play() interrupted by a subsequent load/pause — harmless, do nothing
        console.log('[RadioPlayer] play() AbortError (interrupted) — ignoring')
      } else {
        // Unexpected play() failure — surface it
        onSongError?.(`播放失败：${err.message}`)
      }
    }
  }

  // ── Source change: load + conditionally autoplay ───────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const shouldAutoplay = autoplayNext.current || playingRef.current
    autoplayNext.current = false

    console.log('[RadioPlayer] audio src:', activeSrc || '(none)',
      '| shouldAutoplay:', shouldAutoplay,
      '| introPhase:', introPhaseRef.current)

    const switchTrack = async () => {
      if (isSwitching.current) return
      isSwitching.current = true

      if (!audio.paused && audio.volume > 0) {
        await fadeVolume(audio, audio.volume, 0, 300)
      }
      audio.pause()
      audio.load()
      setPlaying(false)
      setElapsed(0)
      setRealDur(0)
      isSwitching.current = false

      if (shouldAutoplay && introPhaseRef.current !== 'playing') {
        await tryPlay(audio, activeSrc, 700)
      }
    }

    switchTrack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc])

  // ── Auto-play when voice intro ends ───────────────────────────────────────
  useEffect(() => {
    if (prevPhase.current === 'playing' && introPhase === 'ready') {
      const audio = audioRef.current
      if (!audio) return
      const t = setTimeout(() => {
        console.log('[RadioPlayer] voice intro ended → starting song:', activeSrc)
        tryPlay(audio, activeSrc, 900)
      }, 150)
      return () => clearTimeout(t)
    }
    prevPhase.current = introPhase
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introPhase])

  // ── Playback events ────────────────────────────────────────────────────────
  const handleEnded = () => {
    console.log('[RadioPlayer] song ended:', activeSrc)
    setPlaying(false)
    setElapsed(0)
    autoplayNext.current = true
    onNext()
  }

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      await fadeVolume(audio, audio.volume, 0, 400)
      audio.pause()
    } else {
      await tryPlay(audio, activeSrc, 700)
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
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
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
            setNeedsManualPlay(false)
          }}
          onPause={() => setPlaying(false)}
          onEnded={handleEnded}
          onLoadedMetadata={e => setRealDur(e.target.duration)}
          onTimeUpdate={e => setElapsed(e.target.currentTime)}
          onError={e => {
            const mediaErr = e.target.error
            console.log('[RadioPlayer] audio error:', mediaErr,
              '| code:', mediaErr?.code,
              '| src:', activeSrc)

            if (!isRealFileError(mediaErr)) {
              // Code 1 (MEDIA_ERR_ABORTED) — browser aborted its own preload
              // when audio.load() was called. Harmless; do not surface to user.
              return
            }

            const msg = `code ${mediaErr.code} — ${mediaErr.message ?? 'unknown'}`
            console.error('[RadioPlayer] real file error:', msg, '| src:', activeSrc)
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

      {/* Show whenever audio is not playing — persistent resume CTA.
          On Safari this also acts as the manual-play button when autoplay
          was blocked; on all browsers it's a clear "继续" affordance. */}
      {!playing && !introPlaying && (
        <button className="player__tap-play" onClick={toggle}>
          ▶ 继续播放
        </button>
      )}

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
