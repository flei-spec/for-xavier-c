import './SongList.css'

export default function SongList({ songs, currentIndex, onSelect, accentColor }) {
  return (
    <div className="songs">
      <div className="songs__header">
        <p className="songs__label">今晚歌单</p>
        <p className="songs__count">{songs.length} 首</p>
      </div>
      <div className="songs__list">
        {songs.map((song, i) => {
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
                <span className="songs__title">
                  {song.title}
                </span>
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
      </div>
    </div>
  )
}
