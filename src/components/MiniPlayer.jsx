import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import { audioElement } from '../audio/audioElement'
import './MiniPlayer.css'

function fmt(s) {
  if (!s || isNaN(s)) return '--:--'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function MiniPlayer({ onReturnToStation }) {
  const {
    currentSong, currentMood, isPlaying, currentTime, duration,
    pause, resumePlay, tapToPlay, autoplayBlocked,
    nextSong, prevSong, isAiMatch, seek,
  } = useAudioPlayer()

  if (!currentSong) return null

  const progress = duration ? (currentTime / duration) * 100 : 0

  const handleSeek = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }

  const handleToggle = () => {
    if (autoplayBlocked) {
      if (audioElement) audioElement.play().catch(() => {})
      tapToPlay()
    } else if (isPlaying) {
      pause()
    } else {
      resumePlay()
    }
  }

  return (
    <div className="mini-player">
      {/* progress bar at top edge */}
      <div className="mini-player__progress" onClick={handleSeek}>
        <div className="mini-player__fill" style={{ width: `${progress}%`, background: currentMood?.accentColor ?? '#e8b4c0' }} />
      </div>

      <div className="mini-player__body">
        {/* mood indicator — soft when AI-matched */}
        {currentMood && (
          <span className="mini-player__mood" style={{ color: currentMood.accentColor }}>
            {isAiMatch ? '✦' : currentMood.icon}
          </span>
        )}

        {/* song info */}
        <div className="mini-player__info" onClick={onReturnToStation} role="button" tabIndex={0}>
          <span className="mini-player__title">{currentSong.title}</span>
          {currentSong.artist && (
            <span className="mini-player__artist">{currentSong.artist}</span>
          )}
        </div>

        {/* time */}
        <span className="mini-player__time">{fmt(currentTime)}</span>

        {/* controls */}
        <div className="mini-player__controls">
          <button className="mini-player__btn" onClick={prevSong} title="上一首">⏮</button>
          <button className="mini-player__btn mini-player__btn--play" onClick={handleToggle} title={isPlaying ? '暂停' : '播放'}>
            {autoplayBlocked ? '▶' : isPlaying ? '⏸' : '▶'}
          </button>
          <button className="mini-player__btn" onClick={nextSong} title="下一首">⏭</button>
        </div>

        {/* return to station */}
        {onReturnToStation && (
          <button className="mini-player__return" onClick={onReturnToStation} title="返回电台">
            ♫
          </button>
        )}
      </div>
    </div>
  )
}
