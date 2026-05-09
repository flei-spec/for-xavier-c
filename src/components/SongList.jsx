import { useState, useEffect } from 'react'
import './SongList.css'

const PAGE = 6

export default function SongList({ songs, currentIndex, onSelect, accentColor }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  // Reset when mood changes (new song list) or search query changes
  useEffect(() => { setLimit(PAGE) }, [songs])
  useEffect(() => { setLimit(PAGE) }, [query])

  const q = query.trim().toLowerCase()

  // Filter by title or artist, keeping original index for playback
  const filtered = q
    ? songs.reduce((acc, song, i) => {
        if (
          song.title?.toLowerCase().includes(q) ||
          song.artist?.toLowerCase().includes(q)
        ) acc.push({ song, originalIndex: i })
        return acc
      }, [])
    : songs.map((song, i) => ({ song, originalIndex: i }))

  const visible   = filtered.slice(0, limit)
  const remaining = filtered.length - limit
  const allLoaded = remaining <= 0

  return (
    <div className="songs">
      <div className="songs__header">
        <p className="songs__label">今日歌单</p>
        <p className="songs__count">
          {q && filtered.length !== songs.length
            ? `${filtered.length} / ${songs.length} 首`
            : `${songs.length} 首`}
        </p>
      </div>

      <div className="songs__search-row">
        <span className="songs__search-icon">♪</span>
        <input
          className="songs__search"
          type="text"
          placeholder="搜索歌曲或歌手…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {q && (
          <button className="songs__search-clear" onClick={() => setQuery('')}>✕</button>
        )}
      </div>

      <div className="songs__list">
        {visible.length === 0 && (
          <p className="songs__empty">没有找到匹配的歌曲</p>
        )}

        {visible.map(({ song, originalIndex }, i) => {
          const active = originalIndex === currentIndex
          return (
            <button
              key={song.src || originalIndex}
              className={`songs__row ${active ? 'songs__row--active' : ''}`}
              style={active && accentColor ? { '--row-accent': accentColor } : {}}
              onClick={() => onSelect(originalIndex)}
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

        {visible.length > 0 && (
          allLoaded ? (
            <p className="songs__end">已经全部加载完啦</p>
          ) : (
            <button
              className="songs__more"
              onClick={() => setLimit(l => l + PAGE)}
            >
              加载更多 · 还有 {remaining} 首
            </button>
          )
        )}
      </div>
    </div>
  )
}
