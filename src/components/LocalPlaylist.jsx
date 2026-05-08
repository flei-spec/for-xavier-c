import { useState, useRef } from 'react'
import songFilenames from 'virtual:songs-list'
import './LocalPlaylist.css'

const specificReasons = {
  '薛之谦 - 演员': '每个人心里都有一个角色，只是不想再演了。',
  '薛之谦 - 暧昧': '暧昧是比喜欢更难说出口的东西。',
  '薛之谦 - 意外': '所有的爱都是意外，遇见你也是。',
  '薛之谦 - 绅士': '最温柔的，是懂得克制的那种爱。',
  '薛之谦 - 动物世界': '喜欢你这件事，比我想象的还要认真。',
  '薛之谦 - 刚刚好': '不早不晚，在最对的时候遇见你。',
  '薛之谦 - 你还要我怎样': '有些话说了，不如不说；不说，又太难熬。',
  '薛之谦 - 肆无忌惮': '爱一个人，就是想对他肆无忌惮。',
  '薛之谦 - 一半': '你占了我的一半，另一半也想给你。',
  '薛之谦 - 丑八怪': '所有人都看见的东西，有时候才是最美的。',
  '薛之谦 - 最好': '你就是我想要的最好的那个。',
  '薛之谦 - 下雨了': '下雨了，只是想问问你有没有带伞。',
  '薛之谦 - 小孩': '在你面前，我永远只想做个小孩。',
  '薛之谦 - 几个你': '如果有几个你，每一个都想好好珍惜。',
  '薛之谦 - 方圆几里': '方圆几里，只要你在，就是全世界。',
  '薛之谦 - 慢半拍': '我总是慢半拍，但对你，我一直在。',
  '薛之谦 - 深深爱过你(前世)': '前世深深爱过你，今生还在找你。',
  '薛之谦 - 天份': '爱你，是我这辈子最好的天分。',
  '薛之谦 - 木偶人': '不想再假装了，在你面前只想做自己。',
  '薛之谦 - 高尚': '爱一个人，不需要太多理由。',
  '薛之谦 - 其实': '其实我一直都知道，只是不敢先说。',
  '薛之谦 - 我知道你都知道': '有些心意，不用说出口也明白。',
  '薛之谦 - 我好像在哪见过你': '第一次见你，就觉得你是对的人。',
  '薛之谦 - 我想起你了': '不经意间，又想起了你。',
  '薛之谦 - 我终于成了别人的女人': '那些遗憾，终究只剩一首歌来说。',
  '薛之谦 - 那是你离开了北京的生活': '离开之后才明白，某些人是城市的一部分。',
  '薛之谦 - 有没有': '有没有人，会不顾一切地爱你。',
  '薛之谦 - 聊表心意': '说不出口的喜欢，就用这首歌聊表心意。',
  '薛之谦 - 潮流季': '流行过了，真心却从未过时。',
  '薛之谦 - 好想起来': '好想，好想见你一面。',
  '薛之谦 - 怪咖': '怪的人遇见怪的人，就是缘分。',
  '林俊杰 - 江南': '烟雨江南，最适合想一个人。',
  '林俊杰 - 她说': '有些话，只有音乐说得出口。',
  '林俊杰 - 茉莉雨': '雨里有你的影子，茉莉香里有你的名字。',
  '林俊杰 - 小酒窝': '你笑起来的样子，是这世界上最好看的。',
  '林俊杰 - 熟能生巧': '爱一个人久了，连呼吸都成了习惯。',
  '林俊杰 - 记得': '记得你的每一个细节，一直都记得。',
  '林俊杰 - 我还想她': '忘不掉，是因为太认真地喜欢过。',
  '周深 - 雪落下的声音': '雪落下来的声音，安静得像你的名字。',
  '周深 - 兰亭序': '故事写在水里，名字刻在心上。',
  '周深 - 怜悯': '不需要你的怜悯，只需要你的心。',
  '陈粒 - 走马': '走马观花，唯独你让我停下来。',
  '陈粒 - 小半': '你不是全部，你是比全部还多的那一点。',
  '陈粒 - 易燃易爆炸': '遇见你之前，我不知道自己有多容易着火。',
  '陈粒 - 奇妙能力歌': '有你的世界，多了一种奇妙的颜色。',
  '陈粒 - 光': '你是所有黑暗里透进来的那道光。',
  '陈粒 - 虚拟': '现实里难以说出的话，都藏在这首歌里。',
  '毛不易 - 呓语': '半梦半醒之间，说的都是你。',
  '毛不易 - 像我这样的人': '像我这样的人，也在认认真真地爱你。',
  '毛不易 - 无问': '不问从何而来，不问去往何处，只要你在。',
  '毛不易 - 小王日记': '生活里的小事，都想和你分享。',
  '孙燕姿 - 遇见': '遇见，是所有故事最好的开头。',
  '孙燕姿 - 开始懂了': '慢慢懂了，有些人是专门来让你心动的。',
  'G.E.M.邓紫棋 - 光年之外': '跨越光年，只是为了找到你。',
  'G.E.M.邓紫棋 - 句号': '有些故事，不想画上句号。',
  'G.E.M.邓紫棋 - 多远都要在一起': '不管多远，都要在一起。',
  '梁静茹 - 勇气': '爱你，是我做过最勇敢的事。',
  '梁静茹 - 分手快乐': '爱过了，就够了。',
  '陈奕迅 - 孤独患者': '孤独的人，需要一首懂他的歌。',
  '陈奕迅 - 浮夸': '所有的热闹，都是一个人的孤独。',
  '陈奕迅 - 阴天快乐': '阴天也要快乐，因为你在。',
  '陈奕迅 - 爱情转移(国)': '把爱情转移，转移到你身上。',
  '张杰 - 我们都一样': '你不孤单，我们都一样在认真生活。',
  '张杰 - 他不懂': '他不懂你，但我懂。',
  '张杰 - 夜空中最亮的星': '你是我夜空中最亮的那颗星。',
  '张杰 - 今生今世': '今生今世，只认你一个。',
  '张杰 - 着魔': '遇见你，就像被你施了魔法。',
  '张杰 - 明天过后': '无论明天之后是什么，今晚我都想陪着你。',
  '张杰 - 最接近天堂的地方': '有你的地方，就是最接近天堂的地方。',
  '周兴哲 - 永不失联的爱': '不管走多远，爱你这件事永远不断线。',
  '隔壁老樊 - 别怕 我在': '别怕，无论什么时候，我都在。',
  '隔壁老樊 - 多想在平庸的生活拥抱你': '就算平凡，也想每天都拥抱你。',
  '隔壁老樊 - 醒着醉': '想你的感觉，像是清醒着喝醉了。',
  '郁可唯 - 删了吧': '有些东西舍不得删，因为里面有你。',
  '郁可唯 - 水中花': '水中花，镜中月，明知触碰不到还是伸出手。',
  '周深 - Monsters (Live)': '每个人心里都有一只怪兽，被你温柔对待时才安静下来。',
  '单依纯 - 想你时风起': '风一起，就想起你了。',
  '单依纯 - 爱的回归线': '绕了一圈，还是回到你身边。',
  '单依纯 - 下雨天 (Live)': '下雨天，最想听的声音是你的名字。',
  '单依纯 - 给电影人的情书': '每一帧都像是在写给你的情书。',
  '单依纯 - 踮起脚尖爱 (Live版)': '踮起脚尖，努力去触碰你。',
  '那英 - 默': '有些心情，只有沉默才说得清。',
  '那英 - 梦一场': '如果是梦，希望梦里一直有你。',
  '郭顶 - 水星记': '两个人，围绕着彼此，就像水星记里写的那样。',
  '郭顶 - 凄美地': '凄美地，有人在等你，有人在爱你。',
  '苏运莹 - 野子': '野子，自由而真实，像极了你的眼神。',
  '李荣浩 - 年少有为': '年少时的我，没想到会这么喜欢你。',
  '李荣浩 - 我看着你的时候': '看着你，就什么都不用说了。',
  '沈以诚 - 好奇': '好奇你想的是什么，好奇你的一切。',
  '张芸京 - 偏爱': '偏偏是你，让我偏爱到无法自拔。',
  '陈绮贞 - 我喜欢上你时的内心活动': '喜欢一个人，内心是很乱的。',
  '李宇春 - 蜀绣': '蜀绣里绣的，是说不尽的相思。',
  '李宗盛 - 给自己的歌': '认真地活过，认真地爱过，就够了。',
  '李宗盛 - 鬼迷心窍': '被你迷住，无法自拔。',
  '张信哲 - 爱如潮水': '爱如潮水，一浪接一浪地涌向你。',
  '莫文蔚 - 阴天': '阴天不代表没有阳光，只是躲起来了。',
  '莫文蔚 - 如果没有你': '如果没有你，我就不完整了。',
  '梁咏琪 - 短发': '剪了短发，是为了新的开始。',
  '张宇 - 雨一直下': '雨一直下，思念一直在。',
  '张宇 - 替身': '不要替身，只想要你。',
  '陶喆 - 爱我还是他': '你的心里，真的只有我吗？',
  '周传雄 - 黄昏': '黄昏时刻，最想牵着你的手。',
  '萧亚轩 - 错的人': '错的时间遇见对的人，是心里最深的遗憾。',
  '容祖儿 - 就让这大雨全都落下': '就让这大雨全都落下，洗去所有不安。',
  '徐佳莹 - 一样的月光': '同一片月光下，思念的是同一个你。',
  '黄丽玲 - 幸福了 然后呢': '幸福了，然后呢？然后更幸福。',
  '黄丽玲 - 有一种悲伤': '有一种悲伤，叫做明明爱你却说不出口。',
  '黄丽玲 - 我等到花儿也谢了 (Live)': '等你，等到花都谢了，还是舍不得走。',
  '黄丽玲 - 失恋无罪': '爱过了，输了也不是罪。',
  '汪晨蕊 - 爱情转移 (Live)': '把爱转移，转移到你一个人身上。',
  '张靓颖 - 饿狼传说 (Live)': '爱你，比任何时候都更用力。',
  '胡彦斌 - 山丘': '越过山丘，才发现你一直在等我。',
  '胡彦斌 - 你要的全拿走': '你要什么，我都想给你。',
  '谭维维 - 开门见山 (Live)': '开门见山地告诉你，我喜欢你。',
  '华晨宇 - 好想爱这个世界啊 (Live)': '好想爱这个世界，因为你在这个世界里。',
  '王贰浪 - 往后余生': '往后余生，都想和你一起过。',
  '王贰浪 - 盔甲': '你是我最软的心，也是我最硬的盔甲。',
  '王贰浪 - 你也没有错': '你没有错，只是我们的缘分到了。',
  '太一 - 一起逃命': '就算逃命，也要拉着你的手一起跑。',
  '太一 - 负重一万斤长大': '负重长大的人，更懂得珍惜。',
  '丁禹兮 - 消散对白': '那些说了一半的话，消散在风里。',
  '八三夭 - 想见你想见你想见你': '想见你，想见你，想见你。',
  '逃跑计划 - 夜空中最亮的星': '夜空再黑，你是最亮的那一颗。',
  '鬼卞 - 只想要你知道': '只想让你知道，我认真地喜欢过你。',
  '鬼卞 - 佳人': '佳人，是你在我眼里永远的样子。',
  '鬼卞 - 雌雄难辨': '有时候爱一个人，分不清是你还是我先动心。',
  '鬼卞 - 与你何涉': '与你有关的一切，都与我有关。',
  '鬼卞,房东的猫 - 蝴蝶效应': '遇见你，改变了所有。',
  '房东的猫 - 蝴蝶效应': '你的出现，是我生命里最美的蝴蝶效应。',
  '蓝心羽 - 阿拉斯加海湾': '有些感情，像阿拉斯加的海湾，辽阔又安静。',
  '刘可以 - 阿拉斯加海湾': '把思念放在阿拉斯加的海湾，任它漂流。',
  '于潼 - 寂寞沙洲冷': '寂寞的时候，有这首歌陪着你。',
  '陈柏宇 - 行尸走肉': '遇见你之前，不知道自己只是行尸走肉。',
  '戚薇 - 如果爱忘了': '如果爱忘了，那一定是因为太痛了。',
  '徐泽（要不要买菜） - 如果爱忘了': '有些爱，忘不了，就也别勉强忘。',
  '满舒克 - 慢热': '慢热的人爱起来，更加认真。',
  '占二曦 - 问': '有很多问题，只想问问你。',
  '颜人中 - 遇到': '遇到你，是所有巧合里最好的一个。',
  '颜人中 - 晚安': '晚安，愿你在梦里也被温柔对待。',
  '颜人中 - 下一个天亮': '等到下一个天亮，还是会想起你。',
  '高旭 - 不做你的朋友': '不想做你的朋友，只想做你最重要的人。',
  '周笔畅 - 原来你也在这里': '原来你也在这里，世界真的很小。',
  '王天阳 - 借月': '借一轮明月，把思念带给你。',
  '李浩然 - 大城小爱': '大城市里的小小爱情，是最真实的温柔。',
  '于文文 - 奉陪': '你的每一段路，我都愿意奉陪。',
  '黄龄 - 风月': '风月无边，眼里只有你。',
  '井胧 - 丢了你': '丢了你，才知道有多重要。',
  '曲肖冰 - 天亮以前说再见': '天亮以前，把所有想说的都说了。',
  '张碧晨 - 笼': '被困在对你的思念里，心甘情愿。',
  '郭静 - 心墙': '只有你，能翻过我心里的那道墙。',
  '枯木逢春 - 这一生关于你的风景': '这一生，最美的风景，是你。',
  '柏松 - 世间美好与你环环相扣': '所有美好，都和你连在一起。',
  '林俊杰,蔡卓妍 - 小酒窝': '你笑起来的样子，是这世界上最好看的。',
  'Ed Sheeran - Perfect': '你就是那个完美的人。',
  'Ed Sheeran - Shape of You': '形状不同，偏偏契合在一起。',
  'Adele - Easy On Me': '对我温柔一点，就像这首歌一样。',
  'The Chainsmokers,Coldplay - Something Just Like This': '不需要超级英雄，只想要这样的你。',
  'Taylor Swift - Cruel Summer': '残忍的夏天，因为你而变得值得。',
  '段弋,hanji - 223\'s': '两个人，两百二十三个秘密。',
  'YNW Melly,9lokknine - 223\'s': '在深夜，用这首歌想你。',
  'Anthem Lights - As Long as You Love Me': '只要你爱我，就什么都够了。',
  'Anthem Lights,Megan Davies - A Thousand Years': '等你，等了一千年。',
  'Camila Cabello - This Love': '这份爱，一直都在。',
  '韩红,孙楠 - 美丽的神话': '爱是一个美丽的神话，你让它变成真实。',
  'Lukas Graham - 7 Years': '七岁时的梦想，长大后你出现了。',
  'Alan Walker - Faded': '消失在人群里，但对你来说，我一直都在。',
  'OneRepublic - Apologize': '有些遗憾，只能用音乐来表达。',
  'Owl City - Enchanted': '遇见你那一刻，我被迷住了。',
  'SLANDER,Dylan Matthew - Love Is Gone (Acoustic)': '爱消散了，但曾经有过，就值得。',
  'Jeremy Zucker,Bea Miller - comethru': '深夜里，希望你能过来陪我。',
  'Boyce Avenue - Someone You Loved': '被你爱过，是我这辈子最幸运的事。',
  'MADILYN - Someone You Loved': '你爱过的人，不会忘记你。',
  'Tamas Wells - Valder Fields': '有你的地方，才是我想去的地方。',
  'Bruno Major - Easily': '爱上你，太容易了，轻而易举就沦陷了。',
  'Lauv - Love Somebody': '想爱一个人，想爱得很认真。',
}

const reasonPool = [
  '这首歌，适合在深夜一个人听。',
  '有些旋律，一响起就能把人带回某个瞬间。',
  '听这首歌的时候，心里装着一个人。',
  '闭上眼睛，让音符带你去你想去的地方。',
  '这首歌，是某种说不出口的心情。',
  '有些感情，只有音乐才说得清楚。',
  '旋律里藏着所有没说出口的话。',
  '这首歌陪过很多深夜，今晚再听一次。',
  '好的音乐，让人觉得被看见了。',
  '每次听，都像第一次心动。',
  '有种温柔，叫做这首歌在对的时候出现。',
  '音乐是最诚实的，它知道你心里有什么。',
  '这首歌的节奏，和心跳一样。',
  '静静听着，什么都不用想。',
  '深夜的音乐，有种特别的魔力。',
  '有些歌，就像一个拥抱。',
  '这首歌里，有你想表达却说不出的感受。',
  '好好听这首歌，它在帮你说话。',
  '旋律轻轻的，像有人在陪着你。',
  '有人在某个地方，也在听同一首歌想你。',
]

function parseSong(filename, index) {
  const nameWithoutExt = filename.replace(/\.mp3$/i, '')
  const dashIdx = nameWithoutExt.indexOf(' - ')

  let artist, title
  if (dashIdx !== -1) {
    artist = nameWithoutExt.substring(0, dashIdx)
    title = nameWithoutExt.substring(dashIdx + 3)
  } else {
    artist = ''
    title = nameWithoutExt
  }

  const reason = specificReasons[nameWithoutExt] || reasonPool[index % reasonPool.length]
  const url = `/songs/${encodeURIComponent(filename)}`

  return { filename, title, artist, reason, url }
}

const allSongs = songFilenames.map((filename, i) => parseSong(filename, i))

function SongCard({ song }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress((audio.currentTime / audio.duration) * 100)
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration)
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    audio.currentTime = pct * audio.duration
    setProgress(pct * 100)
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '--:--'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className={`lp-card${playing ? ' lp-card--playing' : ''}`}>
      <div className="lp-card__top">
        <button
          className={`lp-card__play ${playing ? 'lp-card__play--pause' : ''}`}
          onClick={togglePlay}
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <div className="lp-card__info">
          <p className="lp-card__title">{song.title}</p>
          {song.artist && <p className="lp-card__artist">{song.artist}</p>}
        </div>

        {duration > 0 && (
          <span className="lp-card__dur">{fmt(duration)}</span>
        )}
      </div>

      <div className="lp-card__bar" onClick={handleSeek}>
        <div className="lp-card__bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <p className="lp-card__reason">「{song.reason}」</p>

      <audio
        ref={audioRef}
        src={song.url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
      />
    </div>
  )
}

export default function LocalPlaylist() {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? allSongs.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist.toLowerCase().includes(search.toLowerCase())
      )
    : allSongs

  return (
    <section className="local-playlist">
      <div className="lp-header">
        <p className="lp-section-label">你喜欢的歌</p>
        <h2 className="lp-title">今晚想陪你听的歌</h2>
        <p className="lp-subtitle">有些歌，好像一开始就是为了某个人存在的。</p>
      </div>

      <div className="lp-search-wrap">
        <input
          className="lp-search"
          type="text"
          placeholder="搜索歌曲或歌手…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="lp-count">{filtered.length} 首</span>
      </div>

      <div className="lp-grid">
        {filtered.map((song, i) => (
          <SongCard key={song.filename} song={song} />
        ))}
      </div>
    </section>
  )
}
