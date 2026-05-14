import { useEffect } from 'react'
import './ReturningUserGreeting.css'

const GREETINGS = {
  '思念': '你上次来的时候，心里好像在想着谁。今晚也在，慢慢听。',
  '幸福': '你上次来的时候，心情好像不错。愿今晚也一样柔软。',
  '委屈': '你上次来的时候，心里好像下了一场小雨。今晚天晴了吗？',
  '懊恼': '你上次来的时候，有些话好像没说出口。今晚不急，慢慢来。',
  '治愈': '你上次来的时候，在给自己一点温柔。今晚也这样，好不好？',
  '放空': '你上次来的时候，什么都不想。今晚也可以就这样漂一会儿。',
  '孤独': '你上次来的时候，想一个人待着。今晚这盏灯还是为你留着。',
  '疲惫': '你上次来的时候，好像有点累。今晚我们慢慢来。',
  '心动': '你上次来的时候，心跳轻轻地跳了一下。那种感觉，还记得吗？',
}

export default function ReturningUserGreeting({ lastMood, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const message = lastMood ? GREETINGS[lastMood] : null
  if (!message) return null

  return (
    <div className="rug" role="status">
      <span className="rug__icon">💌</span>
      <span className="rug__text">{message}</span>
    </div>
  )
}
