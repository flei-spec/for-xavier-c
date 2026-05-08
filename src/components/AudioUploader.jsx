import { useState, useRef } from 'react'
import './AudioUploader.css'

export default function AudioUploader({ onUploaded }) {
  const [fileName, setFileName] = useState('')
  const [drag, setDrag]         = useState(false)
  const inputRef = useRef(null)

  const handle = (file) => {
    if (!file || !file.type.startsWith('audio/')) return
    const blobUrl = URL.createObjectURL(file)
    const name    = file.name.replace(/\.[^.]+$/, '')
    setFileName(file.name)
    onUploaded(blobUrl, name)
  }

  return (
    <div className="upload">
      <p className="upload__label">上传你的歌</p>
      <p className="upload__sub">上传任意音频文件，在这里播放</p>

      <div
        className={`upload__zone ${drag ? 'upload__zone--drag' : ''} ${fileName ? 'upload__zone--done' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={e => handle(e.target.files[0])}
        />

        {fileName ? (
          <>
            <span className="upload__icon">🎵</span>
            <span className="upload__filename">{fileName}</span>
            <span className="upload__change">点击更换</span>
          </>
        ) : (
          <>
            <span className="upload__icon">📂</span>
            <span className="upload__text">把音频拖到这里</span>
            <span className="upload__hint">mp3 · m4a · wav · flac</span>
          </>
        )}
      </div>
    </div>
  )
}
