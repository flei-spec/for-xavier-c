import { useState, useEffect } from 'react'
import './SongList.css'

const PAGE_SIZE = 10

export default function SongList({ songs, currentIndex, onSelect, accentColor }) {
  const [limit, setLimit] = useState(PAGE_SIZE)

  // Reset pagination when mood (song list) changes
  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [songs])

  const visible  = songs.slice(0, limit)
  const remaining = songs.length - limit

  return (
    <div className="songs">
      <div className="songs__header">
        <p className="songs__label">今日歌单</p>
        <p className="songs__count">{songs.length} 首</p>
      </div>
      <div className="songs__list">
        {visible.map((song, i) => {
          const active = i === currentIndex
          return (
            <button
              key={song.src || i}
              className={`songs__row ${active ? 'songs__row--active' : ''}`}
              style={active && accentColor ? { '--row-accent': accentColor } : {}}
              onClick={() => onSelect(i)}
            >
              <span className="songs__num">{active ? '♪' : i + 1}</span>

              <span className="songs__info">
                <span className="songs__title">{song.title}</span>
                {song.artist && (
                  <span className="songs__artist">{song.artist}</span>
                )}
                {song.romanticReason && (
                  <span className="songs__reason">「{song.romanticReason}」</span>
                )}
              </span>

              {song.energyLevel && (
                <span className={`songs__energy songs__energy--${song.energyLevel}`}>
                  {song.energyLevel}
                </span>
              )}
            </button>
          )
        })}

        {remaining > 0 && (
          <button
            className="songs__more"
            onClick={() => setLimit(l => l + PAGE_SIZE)}
          >
            加载更多 · 还有 {remaining} 首
          </button>
        )}
      </div>
    </div>
  )
}
