import { moodMeta } from '../config/moodMeta'

export const profile = {
  name: 'Xavier',
  fullName: 'Xavier.C',
  nickname: '小宝',
  fromName: 'Triston.L',

  startDate: '2026-03-14',
  anniversaryDate: '2027-03-14',

  // ── 见面倒计时 ── change this date to update the countdown card
  meetingDate: '2026-07-04',

  favoriteStyles: [
    '华语情绪流行', '深夜伤感情歌', 'Emotional Mandopop',
    'Late Night R&B', 'Bedroom Pop', '电影感OST',
    '国风古风', '氛围感音乐', 'Romantic Tension',
    'Soft Heartbreak', 'Indie Pop', 'Sensual Alt Pop',
  ],

  // 倒计时卡片轮播 — 来自你写的真实话语
  notes: [
    '我做这个电台，是想让你在想我的时候，也能听见一点点我的陪伴。',
    '如果今天很累，就在这里停一会儿。',
    '无论天亮与否，我都很想你。',
    '好好休息，我爱你。',
    '那个夜晚，我们聊到忘了时间——我常常想起那个夜晚。',
  ],

  // 点击 🤍 五次后解锁
  loveLetter: `小宝，

我做了这个电台，是想让你在想我的时候，也能听见一点点我的陪伴。不是什么了不起的事，就是想让你知道即使我现在不在你身边但是我也会一直都在。

有时候我会忍不住想，你什么情况下会思念我。正走在某条街上看见可爱的小猫，又或刚放下手里的东西，有一瞬间想到了我。

就是这些细碎的、甚至你自己都未必察觉的瞬间，让我对你的喜欢变得毫无逻辑可言，却格外确定。

这些歌，都是从你喜欢的里面悄悄下载下来的。可能还是对音乐没那么了解于是我就只选了那么一点上传到了网页上以防万一。

如果今天很累，就在这里停一会儿。

无论天亮与否，我都很想你。

好好休息，我爱你。

Triston.L 💌`,
}

function m(id, accentColor, djIntro) {
  const meta = moodMeta[id]
  return {
    id,
    label: id,
    icon: meta.icon,
    description: meta.subtitle,
    accentColor,
    djIntro,
  }
}

export const moods = [
  m('思念', '#e8b4c8', `思念是很轻的东西，却重到能让深夜变得特别安静。小宝，我在这里陪你。`),
  m('幸福', '#ffcc80', `世界今晚好像柔软了一点。就这样枕着你的小幸福，让音乐轻轻抱着你。`),
  m('委屈', '#90b8d8', `心里像下了一场小雨对不对，小宝？没关系，雨会停的，我就在这里陪你听。`),
  m('懊恼', '#c9a0dc', `有些话没说出口，压在心上会有点沉。今晚不说也没关系，让歌替你说。`),
  m('治愈', '#80cbc4', `今晚先别对自己太严格了，小宝。你已经做得很好了，现在只需要好好听歌。`),
  m('放空', '#b39ddb', `什么都不用想，什么都不用做。就这样慢慢漂一会儿，思绪飘到哪里就到哪里。`),
  m('孤独', '#8d9db6', `人很多的时候也会想逃走吧。一个人待着不是不好的事，今晚这盏灯为你留着。`),
  m('疲惫', '#a5c8a0', `今天的你已经够好了，小宝。不用再证明什么，好好休息，歌会陪着你。`),
  m('心动', '#f0a0a8', `喜欢有时候藏不住对不对？那种心跳轻轻跳一下的感觉，挺好的。让歌帮你记住这一刻。`),
]
