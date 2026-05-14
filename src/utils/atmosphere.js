// ── WMO weather code classification ─────────────────────────────────────────

export function getWeatherInfo(code) {
  if (code === 0)            return { label: '晴天',   icon: '☀️',  type: 'sunny'   }
  if (code <= 3)             return { label: '多云',   icon: '⛅',  type: 'cloudy'  }
  if (code <= 48)            return { label: '有雾',   icon: '🌫️', type: 'fog'     }
  if (code <= 57)            return { label: '毛毛雨', icon: '🌦️', type: 'rain'    }
  if (code <= 67)            return { label: '下雨',   icon: '🌧️', type: 'rain'    }
  if (code <= 77)            return { label: '下雪',   icon: '❄️',  type: 'snow'   }
  if (code <= 82)            return { label: '阵雨',   icon: '🌧️', type: 'rain'    }
  if (code <= 86)            return { label: '雨夹雪', icon: '🌨️', type: 'snow'   }
  return                            { label: '雷雨',   icon: '⛈️', type: 'storm'   }
}

// ── Time period ──────────────────────────────────────────────────────────────

export function getTimePeriod(hour) {
  if (hour >= 0  && hour < 4)  return 'deepnight'
  if (hour >= 4  && hour < 6)  return 'latenight'
  if (hour >= 6  && hour < 9)  return 'dawn'
  if (hour >= 9  && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 20) return 'dusk'
  if (hour >= 20 && hour < 22) return 'evening'
  return 'night'  // 22-24
}

export const PERIOD_LABELS = {
  deepnight: '深夜',
  latenight: '凌晨',
  dawn:      '清晨',
  morning:   '上午',
  noon:      '中午',
  afternoon: '下午',
  dusk:      '傍晚',
  evening:   '晚上',
  night:     '夜里',
}

// ── Atmosphere theme ─────────────────────────────────────────────────────────

export function getAtmosphereTheme({ weatherType, period, temp }) {
  if (period === 'deepnight' || period === 'latenight') return 'deepnight'
  if (weatherType === 'rain' || weatherType === 'storm') return 'rain'
  if (weatherType === 'snow')                            return 'snow'
  if ((period === 'dawn' || period === 'morning') && weatherType === 'sunny') return 'sunny'
  if (temp !== null && temp < 8)  return 'cold'
  if (temp !== null && temp > 30) return 'hot'
  return 'default'
}

// ── Atmosphere message generator ─────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

export function generateAtmosphereMessage({ weatherType, period, temp, city }) {
  const c = city || '你的城市'
  const t = temp !== null ? `${temp}°C` : ''

  // ── deep night ──────────────────────────────────────────────────────────────
  if (period === 'deepnight') {
    if (weatherType === 'rain')  return pick([
      `${c}的深夜下着雨，外面很安静。你还没睡吗？`,
      `深夜下着雨，今晚不要想太多了。`,
      `雨声很轻，你听见了吗？`,
    ])
    if (weatherType === 'snow')  return `深夜下雪了，外面一定很安静。好好待着。`
    return pick([
      `已经很晚了，你还没睡呀。`,
      `深夜还没睡，是不是心里有什么。`,
      `${c}的深夜，总有人也没睡。今晚有人陪你。`,
    ])
  }

  // ── late night / night ───────────────────────────────────────────────────────
  if (period === 'latenight' || period === 'night') {
    if (weatherType === 'rain') return pick([
      `外面在下雨，今晚就别想太多了。`,
      `雨夜很安静，就这样听着吧。`,
      `${c}的雨夜，音乐最暖。`,
    ])
    return pick([
      `夜深了，好好陪着自己。`,
      `${c}的夜晚，希望你还好。`,
      `今晚的频道只为你打开着。`,
    ])
  }

  // ── evening ─────────────────────────────────────────────────────────────────
  if (period === 'evening') {
    if (weatherType === 'rain') return pick([
      `晚上下雨了，早点回家。`,
      `外面下雨，待在这里就好。`,
    ])
    return pick([
      `晚上好，今晚的电台为你而开。`,
      `夜幕来了，${c}还好吧。`,
      `晚上了，好好放松。`,
    ])
  }

  // ── dusk ────────────────────────────────────────────────────────────────────
  if (period === 'dusk') {
    return pick([
      `天色渐暗，今天辛苦了。`,
      `傍晚了，好好休息一会儿。`,
      `一天快结束了，还好吗？`,
    ])
  }

  // ── rain any time ───────────────────────────────────────────────────────────
  if (weatherType === 'rain' || weatherType === 'storm') {
    return pick([
      `${c}今天下雨了，记得别着凉。`,
      `外面在下雨，音乐帮你挡着。`,
      `雨天最适合待在这里听歌。`,
    ])
  }

  // ── snow ────────────────────────────────────────────────────────────────────
  if (weatherType === 'snow') {
    return pick([
      `${c}下雪了，愿你温暖。`,
      `下雪了，多穿一点。雪天窝着听歌最好。`,
    ])
  }

  // ── temperature extremes ────────────────────────────────────────────────────
  if (temp !== null && temp < 8) {
    return pick([
      `今天${t}，有点冷，要照顾好自己。`,
      `天气冷了，多穿一件。`,
      `${t}，还挺冷的，记得保暖。`,
    ])
  }
  if (temp !== null && temp > 30) {
    return pick([
      `今天${t}，有点热，多喝水。`,
      `天气闷热，希望音乐能让你放松一点。`,
    ])
  }

  // ── morning / dawn ──────────────────────────────────────────────────────────
  if (period === 'dawn') {
    return pick([
      `清晨了，今天也要好好的。`,
      `一大早就来听歌，今天一定是好日子。`,
    ])
  }
  if (period === 'morning') {
    if (weatherType === 'sunny') return pick([
      `今天的阳光很好，希望你也会有好心情。`,
      `${c}今天晴天，好好享受今天。`,
    ])
    return pick([
      `${c}的早晨，希望你能有个好开始。`,
      `早上好，新的一天。`,
    ])
  }

  // ── noon / afternoon ────────────────────────────────────────────────────────
  if (period === 'noon') {
    return pick([
      `中午了，记得好好吃饭。`,
      `日正当中，找个地方歇一歇。`,
    ])
  }
  if (period === 'afternoon') {
    if (weatherType === 'sunny') return pick([
      `今天下午的阳光很好，希望你也会有好心情。`,
      `晴天的下午，适合给自己放松一下。`,
    ])
    return pick([
      `下午了，还好吗？`,
      `${c}的下午，希望还不错。`,
    ])
  }

  // ── fallback ────────────────────────────────────────────────────────────────
  return pick([
    `${c} · 今天也要好好的。`,
    `无论此刻是什么心情，这里的音乐都在。`,
    `今天也是为你打开的频道。`,
  ])
}

// ── Companion messages ───────────────────────────────────────────────────────

const BASE_COMPANION = [
  'Xavier.C 正在陪你听歌',
  '今晚的频道已经为你打开',
  '希望你今天没有太辛苦',
  '现在的你，应该需要一点安静',
  '好好听，不要想太多',
  '今晚就把这里当成自己的地方',
  '有人一直在，不是一个人',
  '你喜欢的歌，都在这里',
  '每一首歌，都是想说的话',
  '希望这首歌，能代替一些话',
  '不需要解释，就这样听着',
  '把今天的事都先放下',
]

const MOOD_COMPANION = {
  '思念': ['回忆总在安静的时候出现', '思念很轻，却重到让夜晚变得安静'],
  '幸福': ['世界今晚好像柔软了一点', '幸福的时候，好好感受这一刻'],
  '委屈': ['心里下了一场小雨，没关系', '不需要解释，就这样听着'],
  '懊恼': ['有些话没说出口也没关系', '今晚先放下，歌会替你说'],
  '治愈': ['今晚先别对自己太严格', '你已经很好了，就这样好好听歌'],
  '放空': ['就这样慢慢漂一会儿吧', '什么都不用想，就这样飘着'],
  '孤独': ['一个人待着也不是不好的事', '人很多的时候也可以想逃走'],
  '疲惫': ['今天的你已经够好了', '不用再证明什么，好好休息'],
  '心动': ['喜欢有时候藏不住', '那种心跳轻轻跳一下的感觉，挺好的'],
}

export function getCompanionMessages(moodId) {
  const moodSpecific = MOOD_COMPANION[moodId] || []
  return [...moodSpecific, ...BASE_COMPANION]
}

// ── Long-stay messages ───────────────────────────────────────────────────────

export const LONG_STAY = [
  { minutes: 8,  msg: '谢谢你今晚留在这里。' },
  { minutes: 18, msg: '陪着你听歌，是今晚最想做的事。' },
  { minutes: 30, msg: '这么晚了你还在，谢谢你。' },
  { minutes: 45, msg: '你的陪伴，是这个电台最好的意义。' },
  { minutes: 60, msg: '一个小时了，今晚辛苦你一直在这里。' },
]
