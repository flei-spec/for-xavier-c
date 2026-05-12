import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { audioElement } from '../audio/audioElement'

// ── Shared audio utilities ────────────────────────────────────────────────────

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

async function tryPlay(audio, fadeMs, onBlocked) {
  audio.volume = 0
  try {
    await audio.play()
    await fadeVolume(audio, 0, 0.88, fadeMs)
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      await new Promise(r => setTimeout(r, 500))
      try {
        await audio.play()
        await fadeVolume(audio, 0, 0.88, fadeMs)
      } catch (_) {
        onBlocked?.()
      }
    } else if (err.name !== 'AbortError') {
      onBlocked?.()
    }
  }
}

function isRealFileError(err) {
  return err != null && err.code >= 2
}

// ── Context ───────────────────────────────────────────────────────────────────

const AudioPlayerContext = createContext(null)

export function useAudioPlayer() {
  return useContext(AudioPlayerContext)
}

export function AudioPlayerProvider({ children }) {
  const [currentSong,     setCurrentSong]     = useState(null)
  const [playlist,        setPlaylist]         = useState([])
  const [songIndex,       setSongIndex]        = useState(0)
  const [currentMood,     setCurrentMood]      = useState(null)
  const [isPlaying,       setIsPlaying]        = useState(false)
  const [currentTime,     setCurrentTime]      = useState(0)
  const [duration,        setDuration]         = useState(0)
  const [autoplayBlocked, setAutoplayBlocked]  = useState(false)

  const audio = audioElement

  // Stable refs so async callbacks never hold stale closure values
  const playlistRef    = useRef([])
  const songIndexRef   = useRef(0)
  const isPlayingRef   = useRef(false)
  const shouldPlayRef  = useRef(false)   // consumed by src-change effect
  const switchAbortRef = useRef(null)
  const errorCbRef     = useRef(null)    // registered by RadioStation

  useEffect(() => { playlistRef.current  = playlist  }, [playlist])
  useEffect(() => { songIndexRef.current = songIndex }, [songIndex])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // ── Permanent event listeners — survive RadioStation unmount ──────────────
  useEffect(() => {
    if (!audio) return

    const onPlay  = () => { setIsPlaying(true); setAutoplayBlocked(false) }
    const onPause = () => setIsPlaying(false)
    const onTU    = e  => setCurrentTime(e.target.currentTime)
    const onMeta  = e  => setDuration(e.target.duration)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      const pl   = playlistRef.current
      const next = (songIndexRef.current + 1) % Math.max(pl.length, 1)
      const song = pl[next]
      if (song) {
        shouldPlayRef.current = true
        setSongIndex(next)
        setCurrentSong(song)
      }
    }
    const onError = e => {
      if (!isRealFileError(e.target.error)) return
      const msg = `code ${e.target.error.code} — ${e.target.error.message ?? 'unknown'}`
      errorCbRef.current?.(msg, audio.src)
    }

    audio.addEventListener('play',           onPlay)
    audio.addEventListener('pause',          onPause)
    audio.addEventListener('timeupdate',     onTU)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended',          onEnded)
    audio.addEventListener('error',          onError)

    return () => {
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
      audio.removeEventListener('timeupdate',     onTU)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended',          onEnded)
      audio.removeEventListener('error',          onError)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Src change: load + optionally autoplay ────────────────────────────────
  useEffect(() => {
    if (!audio || !currentSong?.src) return

    const shouldPlay = shouldPlayRef.current
    shouldPlayRef.current = false

    let cancelled = false
    const prev = switchAbortRef.current
    switchAbortRef.current = () => { cancelled = true }
    if (prev) prev()

    ;(async () => {
      if (!audio.paused && audio.volume > 0) await fadeVolume(audio, audio.volume, 0, 300)
      if (cancelled) return

      audio.pause()
      audio.src = currentSong.src
      audio.load()
      setCurrentTime(0)
      setDuration(0)

      if (shouldPlay) {
        await tryPlay(audio, 700, () => setAutoplayBlocked(true))
      }
    })()
  }, [currentSong?.src]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── MediaSession API ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSong || typeof navigator === 'undefined') return
    try {
      const ms = navigator.mediaSession
      if (!ms || typeof MediaMetadata === 'undefined') return
      ms.metadata = new MediaMetadata({
        title:  currentSong.title  ?? '',
        artist: currentSong.artist ?? '',
        album:  currentMood?.label ?? '',
      })
      ms.setActionHandler('play',          () => audio?.play().catch(() => {}))
      ms.setActionHandler('pause',         () => audio?.pause())
      ms.setActionHandler('nexttrack',     () => nextSong())
      ms.setActionHandler('previoustrack', () => prevSong())
    } catch (_) {}
  }, [currentSong?.title, currentMood?.label]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────────────────────────

  // Set a new playlist and start from a specific index
  const loadPlaylist = useCallback((songs, mood, index, autoplay) => {
    const song = songs[index] ?? null
    setPlaylist(songs)
    setCurrentMood(mood)
    setSongIndex(index)
    setAutoplayBlocked(false)
    shouldPlayRef.current = autoplay
    setCurrentSong(song)
  }, [])

  // Jump to a specific index in the current playlist
  const selectSong = useCallback((index) => {
    const song = playlistRef.current[index]
    if (!song) return
    shouldPlayRef.current = isPlayingRef.current || (audio ? !audio.paused : false)
    setSongIndex(index)
    setCurrentSong(song)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update the playlist reference without changing the current song
  const updatePlaylist = useCallback((songs, newIndex) => {
    setPlaylist(songs)
    if (newIndex !== undefined) {
      setSongIndex(Math.max(0, Math.min(newIndex, songs.length - 1)))
    }
  }, [])

  const pause = useCallback(() => { audio?.pause() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resume or tap-to-play: called after autoplay block or by MiniPlayer
  const resumePlay = useCallback(() => {
    if (!audio) return
    tryPlay(audio, 400, () => setAutoplayBlocked(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Called when voice intro ends — slight delay to feel cinematic
  const startAfterIntro = useCallback(() => {
    if (!audio) return
    setTimeout(() => {
      tryPlay(audio, 900, () => setAutoplayBlocked(true))
    }, 150)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Called from tap-to-enter overlay: re-registers gesture then plays
  const tapToPlay = useCallback(() => {
    setAutoplayBlocked(false)
    if (!audio) return
    tryPlay(audio, 700, () => setAutoplayBlocked(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const nextSong = useCallback(() => {
    const pl  = playlistRef.current
    if (!pl.length) return
    const idx  = (songIndexRef.current + 1) % pl.length
    const song = pl[idx]
    if (!song) return
    shouldPlayRef.current = isPlayingRef.current || (audio ? !audio.paused : false)
    setSongIndex(idx)
    setCurrentSong(song)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prevSong = useCallback(() => {
    const pl  = playlistRef.current
    if (!pl.length) return
    const idx  = (songIndexRef.current - 1 + pl.length) % pl.length
    const song = pl[idx]
    if (!song) return
    shouldPlayRef.current = isPlayingRef.current || (audio ? !audio.paused : false)
    setSongIndex(idx)
    setCurrentSong(song)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const seek = useCallback((time) => {
    if (audio) audio.currentTime = time
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // RadioStation registers a callback to receive song error notifications
  const setErrorCallback = useCallback((fn) => {
    errorCbRef.current = fn
  }, [])

  const value = useMemo(() => ({
    currentSong, playlist, songIndex, currentMood,
    isPlaying, currentTime, duration, autoplayBlocked,
    loadPlaylist, selectSong, updatePlaylist,
    pause, resumePlay, startAfterIntro, tapToPlay,
    nextSong, prevSong, seek, setErrorCallback,
  }), [
    currentSong, playlist, songIndex, currentMood,
    isPlaying, currentTime, duration, autoplayBlocked,
    loadPlaylist, selectSong, updatePlaylist,
    pause, resumePlay, startAfterIntro, tapToPlay,
    nextSong, prevSong, seek, setErrorCallback,
  ])

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  )
}
