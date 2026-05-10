import { useState, useEffect, useMemo } from 'react'
import './SongList.css'

const MOOD_PAGE = 10
const SEARCH_PAGE = 20
const SEARCH_INC  = 20

export default function SongList({ songs, currentIndex, onSelect, accentColor, allSongs, libraryLoading }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(MOOD_PAGE)

  const q = query.trim().toLowerCase()
  const isSearchMode = Boolean(q)
  const searchSource = (allSongs?.length > 0) ? allSongs : songs

  // Reset paging when mode or song list changes
  useEffect(() => { setLimit(isSearchMode ? SEARCH_PAGE : MOOD_PAGE) }, [isSearchMode])
  useEffect(() => { setLimit(MOOD_PAGE) }, [songs])

  const filtered = useMemo(() => {
    if (!isSearchMode) {
      return songs.map((song, i) => ({ song, originalIndex: i, inCurrentMood: true }))
    }
    return searchSource.reduce((acc, song) => {
      const matches =
        song.title?.toLowerCase().includes(q) ||
        song.artist?.toLowerCase().includes(q) ||
        song.moodTags?.some(t => t.toLowerCase().includes(q))
      if (!matches) return acc
      const originalIndex = songs.findIndex(s => s.src === song.src)
      acc.push({ song, originalIndex, inCurrentMood: originalIndex >= 0 })
      return acc
    }, [])
  }, [isSearchMode, searchSource, songs, q])

  const visible   = filtered.slice(0, limit)
  const remaining = filtered.length - limit

  const countLabel = isSearchMode
    ? `${filtered.length} / ${searchSource.length} 首`
    : `${songs.length} 首`

  const placeholder = (allSongs?.length > 0)
    ? `搜索全部 ${allSongs.length} 首歌曲…`
    : '搜索歌曲或歌手…'

  return (
    <div className="songs">
      <div className="songs__header">
        <p className="songs__label">{isSearchMode ? '搜索结果' : '今日歌单'}</p>
        <p className="songs__count">{countLabel}</p>
      </div>

      <div className="songs__search-row">
        <span className="songs__search-icon">♪</span>
        <input
          className="songs__search"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {q && (
          <button className="songs__search-clear" onClick={() => setQuery('')}>✕</button>
        )}
      </div>

      {/* Loading state while library fetches */}
      {libraryLoading && !isSearchMode && songs.length === 0 && (
        <p className="songs__loading">正在为你准备歌单…</p>
      )}

      <div className="songs__list">
        {!libraryLoading && visible.length === 0 && (
          <p className="songs__empty">没有找到匹配的歌曲</p>
        )}

        {visible.map(({ song, originalIndex, inCurrentMood }, i) => {
          const active = inCurrentMood && originalIndex === currentIndex
          return (
            <button
              key={song.src || i}
              className={`songs__row ${active ? 'songs__row--active' : ''} ${!inCurrentMood ? 'songs__row--dim' : ''}`}
              style={active && accentColor ? { '--row-accent': accentColor } : {}}
              onClick={() => inCurrentMood && onSelect(originalIndex)}
              title={!inCurrentMood ? '此歌不在当前心情歌单，切换心情可播放' : undefined}
            >
              <span className="songs__num">
                {active ? '♪' : (inCurrentMood ? i + 1 : '·')}
              </span>

              <span className="songs__info">
                <span className="songs__title">{song.title}</span>
                {song.artist && (
                  <span className="songs__artist">{song.artist}</span>
                )}
                {!inCurrentMood && isSearchMode && song.moodTags?.length > 0 && (
                  <span className="songs__mood-hint">
                    {song.moodTags.slice(0, 2).join(' · ')}
                  </span>
                )}
                {song.romanticReason && inCurrentMood && (
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
          remaining <= 0 ? (
            <p className="songs__end">已经全部加载完啦</p>
          ) : (
            <button
              className="songs__more"
              onClick={() => setLimit(l => l + (isSearchMode ? SEARCH_INC : MOOD_PAGE))}
            >
              加载更多 · 还有 {remaining} 首
            </button>
          )
        )}
      </div>
    </div>
  )
}
