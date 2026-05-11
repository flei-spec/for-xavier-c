import { useState, useEffect, useRef } from 'react'
import { audioElement } from '../audio/audioElement'
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
// MediaError codes:
//   1 = MEDIA_ERR_ABORTED   — browser aborted its own fetch (e.g. after load())
//   2 = MEDIA_ERR_NETWORK   — network failure during fetch
//   3 = MEDIA_ERR_DECODE    — audio could not be decoded
//   4 = MEDIA_ERR_SRC_NOT_SUPPORTED — format or URL not supported (incl. 404)
//
// Only codes 2–4 indicate a genuinely broken/missing file.
// Code 1 fires harmlessly when audio.load() resets mid-fetch; ignore it.
function isRealFileError(mediaError) {
  return mediaError != null && mediaError.code >= 2
}

// ── tryPlay — attempt play(), silently retry once on NotAllowedError ──────────
async function tryPlay(audio, src, fadeMs, onBlocked) {
  audio.volume = 0
  try {
    await audio.play()
    console.log('[RadioPlayer] ▶ playing:', src)
    await fadeVolume(audio, 0, 0.88, fadeMs)
  } catch (err) {
    console.log('[RadioPlayer] play blocked:', err.name, err.message, '| src:', src)

    if (err.name === 'NotAllowedError') {
      // iOS/Safari blocked autoplay despite unlock attempt.
      // Retry once after a short delay — the event loop tick sometimes makes
      // the difference on borderline gesture-context expiry.
      await new Promise(r => setTimeout(r, 500))
      try {
        await audio.play()
        console.log('[RadioPlayer] ▶ playing (retry):', src)
        await fadeVolume(audio, 0, 0.88, fadeMs)
      } catch (retryErr) {
        console.log('[RadioPlayer] play blocked after retry:', retryErr.name, '| src:', src)
        onBlocked?.()
      }
    } else if (err.name !== 'AbortError') {
      // AbortError = interrupted by a subsequent load/pause — harmless, ignore.
      // Anything else is unexpected; surface via onBlocked.
      onBlocked?.()
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RadioPlayer({
  mood, song, onNext, onPrev,
  introPhase, onSongError,
  autoStart = false,
  onAutoplayBlocked,  // called when autoplay is blocked by browser policy
  forceTrigger = 0,   // increment to force a play attempt (used by tap-to-enter)
}) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [realDur, setRealDur] = useState(0)

  // Refs to stable callbacks so addEventListener closures stay fresh
  const onNextRef            = useRef(onNext)
  const onSongErrorRef       = useRef(onSongError)
  const onAutoplayBlockedRef = useRef(onAutoplayBlocked)
  const prevPhase            = useRef(introPhase)
  // Cancellation token for in-progress track switches.  When activeSrc changes
  // while a fade-out is running, the previous switch is cancelled so the newer
  // src always wins instead of being silently skipped.
  const switchAbortRef       = useRef(null)
  const playingRef           = useRef(false)
  const introPhaseRef        = useRef(introPhase)
  const autoplayNext         = useRef(autoStart)

  useEffect(() => { onNextRef.current            = onNext            }, [onNext])
  useEffect(() => { onSongErrorRef.current       = onSongError       }, [onSongError])
  useEffect(() => { onAutoplayBlockedRef.current = onAutoplayBlocked }, [onAutoplayBlocked])
  useEffect(() => { playingRef.current           = playing           }, [playing])
  useEffect(() => { introPhaseRef.current        = introPhase        }, [introPhase])

  const audio   = audioElement       // singleton, never recreated
  const activeSrc = song?.src ?? ''

  // ── Attach persistent event listeners once on mount ────────────────────────
  useEffect(() => {
    if (!audio) return

    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTU    = (e) => setElapsed(e.target.currentTime)
    const onMeta  = (e) => setRealDur(e.target.duration)

    const onEnded = () => {
      console.log('[RadioPlayer] song ended:', audio.src)
      setPlaying(false)
      setElapsed(0)
      autoplayNext.current = true
      onNextRef.current?.()
    }

    const onError = (e) => {
      const mediaErr = e.target.error
      console.log('[RadioPlayer] audio error:', mediaErr, '| code:', mediaErr?.code, '| src:', audio.src)
      if (!isRealFileError(mediaErr)) return   // code 1 = harmless abort
      const msg = `code ${mediaErr.code} — ${mediaErr.message ?? 'unknown'}`
      console.error('[RadioPlayer] real file error:', msg, '| src:', audio.src)
      onSongErrorRef.current?.(`无法加载：${audio.src.split('/').pop()} (${msg})`)
    }

    audio.addEventListener('play',          onPlay)
    audio.addEventListener('pause',         onPause)
    audio.addEventListener('timeupdate',    onTU)
    audio.addEventListener('loadedmetadata',onMeta)
    audio.addEventListener('ended',         onEnded)
    audio.addEventListener('error',         onError)

    return () => {
      audio.removeEventListener('play',          onPlay)
      audio.removeEventListener('pause',         onPause)
      audio.removeEventListener('timeupdate',    onTU)
      audio.removeEventListener('loadedmetadata',onMeta)
      audio.removeEventListener('ended',         onEnded)
      audio.removeEventListener('error',         onError)
      // Stop playback when the player unmounts (e.g. user navigates away)
      if (!audio.paused) audio.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Source change: load + conditionally autoplay ───────────────────────────
  useEffect(() => {
    if (!audio || !activeSrc) return

    const shouldAutoplay = autoplayNext.current || playingRef.current
    autoplayNext.current = false

    console.log('[RadioPlayer] audio src:', activeSrc,
      '| shouldAutoplay:', shouldAutoplay,
      '| introPhase:', introPhaseRef.current)

    // Cancel any in-progress switch so a rapid src change (e.g. random index
    // landing after index-0 placeholder) always resolves to the latest src.
    let cancelled = false
    const prevAbort = switchAbortRef.current
    switchAbortRef.current = () => { cancelled = true }
    if (prevAbort) prevAbort()

    const switchTrack = async () => {
      if (!audio.paused && audio.volume > 0) await fadeVolume(audio, audio.volume, 0, 300)
      if (cancelled) return   // a newer src arrived while we were fading out

      audio.pause()
      audio.src = activeSrc
      audio.load()
      setPlaying(false)
      setElapsed(0)
      setRealDur(0)
      switchAbortRef.current = null

      console.log('AUDIO SRC:', audio.src)

      if (shouldAutoplay && introPhaseRef.current !== 'playing') {
        await tryPlay(audio, activeSrc, 700, onAutoplayBlockedRef.current)
      }
    }

    switchTrack()
  // activeSrc is the only real dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc])

  // ── Auto-play when voice intro ends ───────────────────────────────────────
  useEffect(() => {
    if (prevPhase.current === 'playing' && introPhase === 'ready') {
      if (!audio) return
      const t = setTimeout(() => {
        console.log('[RadioPlayer] voice intro ended → starting song:', activeSrc)
        tryPlay(audio, activeSrc, 900, onAutoplayBlockedRef.current)
      }, 150)
      return () => clearTimeout(t)
    }
    prevPhase.current = introPhase
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introPhase])

  // ── Force-play trigger (tap-to-enter gesture recovery) ────────────────────
  useEffect(() => {
    if (!forceTrigger || !audio || !activeSrc) return
    console.log('[RadioPlayer] forceTrigger — starting playback after tap-to-enter')
    tryPlay(audio, activeSrc, 700)
  // forceTrigger is the only real dependency; audio/activeSrc are stable within a song
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceTrigger])

  // ── User controls ──────────────────────────────────────────────────────────
  const toggle = async () => {
    if (!audio) return
    if (playing) {
      await fadeVolume(audio, audio.volume, 0, 400)
      audio.pause()
    } else {
      await tryPlay(audio, activeSrc, 700)
    }
  }

  const handleSeek = (e) => {
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

      {/* No <audio> element — using the singleton audioElement from ../audio/audioElement */}

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
