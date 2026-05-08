import { useState, useRef } from 'react'
import './VoiceRecorder.css'

export default function VoiceRecorder({ onRecorded }) {
  const [state, setState] = useState('idle') // idle | recording | done | playing
  const [url, setUrl]     = useState(null)
  const [err, setErr]     = useState('')
  const recRef  = useRef(null)
  const chunks  = useRef([])
  const audioEl = useRef(null)

  const start = async () => {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      recRef.current = rec
      chunks.current = []

      rec.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const blobUrl = URL.createObjectURL(blob)
        setUrl(blobUrl)
        setState('done')
        onRecorded(blobUrl)
        stream.getTracks().forEach(t => t.stop())
      }

      rec.start()
      setState('recording')
    } catch {
      setErr('需要麦克风权限才能录音。')
    }
  }

  const stop = () => recRef.current?.stop()

  const play = () => {
    audioEl.current?.play()
    setState('playing')
  }

  const reset = () => { setUrl(null); setState('idle') }

  return (
    <div className="rec">
      <p className="rec__label">语音留言</p>
      <p className="rec__sub">录一段话，让她听见你</p>

      {url && <audio ref={audioEl} src={url} onEnded={() => setState('done')} style={{ display:'none' }} />}

      {state === 'idle' && (
        <button className="rec__btn rec__btn--start" onClick={start}>
          🎤 开始录音
        </button>
      )}

      {state === 'recording' && (
        <div className="rec__active">
          <div className="rec__live">
            <span className="rec__dot" />
            <span>录音中…</span>
          </div>
          <button className="rec__btn rec__btn--stop" onClick={stop}>⏹ 停止</button>
        </div>
      )}

      {(state === 'done' || state === 'playing') && (
        <div className="rec__done">
          <button className="rec__btn rec__btn--play" onClick={play}>
            {state === 'playing' ? '♪ 播放中…' : '▶ 播放留言'}
          </button>
          <button className="rec__btn rec__btn--reset" onClick={reset}>重新录制</button>
        </div>
      )}

      {err && <p className="rec__err">{err}</p>}
    </div>
  )
}
