// Shared fallback text for AI routes and frontend network-failure fallback.
// This module is key-free and safe to import from both src/ and api/.

export const FALLBACK_LINES = {
  '思念': [
    '有些名字不用说出来，歌里全是。',
    '想一个人的时候，时间好像会变慢一点点。',
  ],
  '幸福': [
    '今天的快乐藏不住的，歌一听就知道了。',
    '有些暖意不用说出来，让歌替你说吧。',
  ],
  '委屈': [
    '心里下了一场小雨，歌帮你撑一会儿。',
    '有些重量暂时放下来也没关系。',
  ],
  '懊恼': [
    '有些事今晚想不清楚也没关系。',
    '先别急着解决所有问题，停一下也很好。',
  ],
  '治愈': [
    '今晚不说别的，就让音乐帮你挡一会儿。',
    '让声音先靠近你一点吧。',
  ],
  '放空': [
    '把今天慢慢冲走吧，歌会等你的。',
    '热水和好歌，今晚就够了。',
  ],
  '孤独': [
    '不用解释什么，就这样安静地漂着。',
    '思绪飘到哪里，就让歌跟到哪里。',
  ],
  '疲惫': [
    '累了就慢一点，今晚不需要证明什么。',
    '你今天已经很努力了，先歇一会儿吧。',
  ],
  '心动': [
    '有些心跳不用说出来，歌听得见。',
    '喜欢轻轻的，像刚好能听见的那一句。',
  ],
}

export function getFallbackLine(mood) {
  const lines = FALLBACK_LINES[mood]
  if (!lines) return '今晚就这样慢慢听吧。'
  return lines[Math.floor(Math.random() * lines.length)]
}
