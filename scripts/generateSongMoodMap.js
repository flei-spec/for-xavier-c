import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const songsDir = path.resolve(__dirname, '../public/songs')
const files = fs.readdirSync(songsDir).filter(f => /\.mp3$/i.test(f)).sort()

// ── classification helpers ──────────────────────────────────────────────────

function parseName(filename) {
  const base = filename.replace(/\.mp3$/i, '')
  const dash = base.indexOf(' - ')
  if (dash !== -1) return { artist: base.slice(0, dash), title: base.slice(dash + 3) }
  return { artist: '', title: base }
}

const has = (text, ...terms) => terms.some(t => text.includes(t))

function classify(filename) {
  const { artist, title } = parseName(filename)
  const full = (artist + ' ' + title).toLowerCase()
  const zh = artist + ' ' + title  // original case for Chinese matching

  const moodTags = []
  let energyLevel = '中'

  // ── 想你了 ──
  if (has(zh,
    '想你','想念','删了','多想','思念','再也没有','不再联系','离你',
    '还是分开','你走了','没有你','分手','原谅','遺憾','遗憾','消散',
    '孤独患者','心如止水','佳人','拾忆','空空','不见','泪桥','念你',
    '丢了你','行尸走肉','重来','刘梓炎','原谅我','姜铭杨','留什么给你',
    '冯子晨','我要找到你','王雨桐','尘埃','小咪','我走后','张叶蕾',
    '曲甲','沉醉的青丝','如果爱忘了','单依纯','想你时风起',
    'h3R3','他只是经过','宫阁','还要多久','郑中基','答应不爱你',
    '陈洁仪','Wang Jia Yi','永彬Ryan','再也没有','苏琛','胥睿',
    '鬼卞','只想要你知道','鬼卞','与你何涉','颜人中','遇到',
  ) ||
  has(full,
    'missing','gone','goodbye','leave','left me','without you',
    'let me down','someone you loved','love is gone','let somebody go',
    'dancing with your ghost','easy on me','apologize','seasons in the sun',
    'bleeding love','not afraid','love the way you lie','nothing like us',
    'come around me','mark my words','die in your arms','never let you go',
    'let it go','how do i love thee','i remember','your bones',
    'valder fields','long way home','comethru','lowkey','your ghost',
    'an ocean of stars','leave out all the rest'
  )) moodTags.push('想你了')

  // ── 想被抱抱 ──
  if (has(zh,
    '别怕 我在','多想在平庸','抱我','拥抱','蔡徐坤','hug me','Hug me',
    '隔壁老樊','下辈子如果','盔甲','靠着你','在你的身边','美丽的神话',
    '追寻你','借月','永不失联的爱','往后余生','柏松','世间美好',
  ) ||
  has(full,
    'hug','hold me','stay','beside me','together','arms around',
    'need you here','close to me','a thousand years','as long as you love me',
    'never let you go','stuck with u','something just like this',
    'enchanted','good times','love somebody','love me like you do'
  )) moodTags.push('想被抱抱')

  // ── 今天很幸福 ──
  if (has(zh,
    '幸福了','世间美好','永不失联','往后余生','遇见','勇气',
    '今生今世','最接近天堂','陪你度过','一样的月光','直到遇见了你',
    '韩红,孙楠','美丽的神话','林俊杰','茉莉雨','小酒窝','梁山伯',
    '好想爱这个世界','王天戈','追寻你','孙燕姿','开始懂了',
    '颜人中','下一个天亮','陈柯宇','直到遇见了你','张杰','今生今世',
    '张杰','最接近天堂','周兴哲','卢润泽','爱就一个字',
    '许嵩','燕归巢','张钰琪','陪你度过漫长岁月',
    '枯木逢春','这一生关于你的风景',
  ) ||
  has(full,
    'perfect','wonderful','best part','golden','from the start',
    'valentine','lovesick','bloom','good days','all of me',
    'thinking out loud','beautiful','magical','wonderful u',
    'a thousand years','love me like you do','peaches','sleepyhead',
    'mariage d\'amour','new soul','bamboo','how do i love thee'
  )) moodTags.push('今天很幸福')

  // ── 开心开心 ──
  if (has(zh,
    '开心','快乐','野子','再不疯狂','恶作剧','古巨基','必杀技',
    '小酒窝','李宇春','再不疯狂','苏运莹','坤木Joymo','PARTY',
    '李荣浩','年少有为','贰佰','玫瑰','明天过后','隔壁老樊','醒着醉',
    '跳楼机','特别的人','雨爱','小乐哥','大眠','呆呆破',
    '周星星','高旭','不做你的朋友',
  ) ||
  has(full,
    'happy','good day','sunshine','smile','dancing','dance',
    'party','fun','celebration','summer','fever','groove',
    'shake it','uptown','24kgoldn','mood','swagger jagger',
    'domino','bang bang','wasabi','queen','boys','lizzo',
    'cheap thrills','havana','shape of you','attention','boyfriend',
    'up ','young dumb','bad romance','pumped up','old town road',
    'rockstar','whip a tesla','savage love','that\'s what i like',
    'señorita','galway girl','summertrain','juliet','passionfruit',
    'say my name','now or never','river ','lowkey',
    'take it all in','chillin','wassuh','nomo','tease'
  )) moodTags.push('开心开心')

  // ── 需要安慰 ──
  if (has(zh,
    '像我这样的人','山丘','如果没有你','没有人心疼我','行尸走肉',
    '你也没有错','负重一万斤长大','无问','陈雪凝','毛不易',
    '莫文蔚','阴天','失恋无罪','有一种悲伤','张惠妹','哭不出来',
    '占二曦','问','郭静','心墙','黄丽玲','悲伤','失恋',
    '郁可唯','水中花','陈奕迅','阴天快乐','PIggy','孤独的灵魂',
    '刘大壮','我很好','徐秉龙','孤身','盛哲','在你的身边',
    '大城小爱','冬野','安和桥','中野','太傻','梁咏琪','短发',
  ) ||
  has(full,
    'easy on me','someone you loved','comfort','it\'s okay','don\'t cry',
    'make it through','hang on','keep your head up','sad','lonely',
    'heartbreak','broken','crying','hurt','pain','heal',
    'leave out all the rest','your bones','let it go',
    'apologize','seasons in the sun','long way home',
    'let me down slowly','dancing with your ghost',
    'love is gone','pray','bad day','i\'m with you',
    'innocence','bleeding love'
  )) moodTags.push('需要安慰')

  // ── 有点苦恼 ──
  if (has(zh,
    '演员','易燃易爆炸','出卖','怪咖','木偶人','几个你','有一种悲伤',
    '那是你离开了北京','暗巷','肆无忌惮','你还要我怎样','我终于成了',
    '死性不改','答应不爱你','陶喆','爱我还是他','错的人','谁又不是',
    '不跟你好了','我要吃泡芙','BigYear','简弘亦','张碧晨','笼',
    '雌雄难辨','鬼卞','佳人','阿冗','与我无关','高旭','不做你的朋友',
    '夏日入侵企画','极恶都市','Jony J','暗巷',
  ) ||
  has(full,
    'confused','trouble','complicated','bored','lie to me',
    'if i were a boy','strange','dark','frustrated','lost',
    'decode','supermassive','strangers','in disguise',
    'black sheep','labour','prey','nexus','river','mercy',
    'therefore i am','bad guy','now or never','you so done',
    'omen','ex ','ex,','kiana'
  )) moodTags.push('有点苦恼')

  // ── 洗澡放松一下 ──
  if (has(zh,
    '逍遥','野子','奇妙能力歌','光','虚拟','风月','梦','飘','悠',
    '风的颜色','炫动小霸王','墨染','新诚觉一','青玉恋','陈其钢','秦淮景',
    '王源','友谊地久天长','胡儆之Jinzy','逍遥','Piano',
    '所念皆星河','李宇春','蜀绣','尹昔眠','西楼别序',
    '葛东琪','囍','乐乐','辞家千里','李宗盛','给自己的歌',
  ) ||
  has(full,
    'relax','chill','easy','smooth','acoustic','piano','bamboo',
    'valder','sleepyhead','dreamy','soft','float','lazy',
    'mariage','classical','lofi','lo-fi','ambient','mellow',
    'galway girl','new soul','free loop','long way home',
    'summertrain','enchanted','easily','throwaway','met at a party',
    'bored','pasta','hush','lowkey','tease','chillin'
  )) moodTags.push('洗澡放松一下')

  // ── 想一个人发呆 ──
  if (has(zh,
    '水星记','凄美地','走马','兰亭序','雪落下的声音','小半','呓语',
    '借月','风月','黄昏','那时雨','就让这大雨','阿拉斯加海湾',
    '蓝心羽','刘可以','你的轮廓','马也','深夜','安静','寂寞沙洲',
    '单依纯','爱的回归线','徐秉龙','想自由','丁禹兮','消散对白',
    '刘思鉴','Stranger','陈奕迅','孤独患者','浮夸',
    '周深','Monsters','怜悯','凤凰传奇','海底','一支榴莲','海底',
    '烟(许佳豪)','偏爱和例外','炫动小霸王','墨染',
    '尹昔眠','西楼别序','黄龄','星河叹','珺锦Queena','诀爱',
    'en（王翊恩）','若梦','范芽芽','雨天','徐良','那时雨',
    '盛哲','在你的身边','王天阳','借月',
  ) ||
  has(full,
    'slow','dream','night','alone','quiet','wander','drift',
    'valder fields','your bones','of monsters','an ocean of stars',
    'met at a party','love is gone','darkness','shadow',
    'your ghost','dancing with','faded','hush','throwaway',
    'free loop','supermassive','decode','leave out all the rest',
    'i remember','mocca','how do i love thee','50 feet'
  )) moodTags.push('想一个人发呆')

  // ── 今天有点累 ──
  if (has(zh,
    '累','呓语','山丘','负重一万斤','无问','我很好','孤身',
    '消散对白','张碧晨','慢冷','满舒克','慢热','刘大壮','会不会',
    '徐秉龙','林宥嘉','那英','梦一场','那英','默',
    '周传雄','黄昏','王唯旖','舍得','李宗盛','给自己的歌',
    '毛不易','小王日记','呓语','胡彦斌','你要的全拿走',
    '陈柏宇','行尸走肉','刘大拿','我知道','牟凡','爱的哲学',
    '范芽芽','雨天','颜人中','晚安','徐秉龙','想自由',
  ) ||
  has(full,
    'tired','slow down','rest','quiet night','gentle','soft',
    'let me down slowly','easy on me','acoustic','piano',
    'someone you loved','stay here','low','fade','twilight',
    'let it go','leave out all','seasons in the sun',
    'make it through','long way home','7 years','i remember',
    'your bones','bamboo','mariage','how do i love thee',
    'free loop','sleeping','sleepyhead','hush',
    'met at a party','love is gone (acoustic)',
    'slander','comethru'
  )) moodTags.push('今天有点累')

  // ── fallback: ensure every song has at least 1 tag ──
  if (moodTags.length === 0) {
    // Try artist-level fallback
    if (has(zh,'薛之谦')) moodTags.push('想你了','有点苦恼')
    else if (has(zh,'Justin Bieber','Justin')) moodTags.push('开心开心','想被抱抱')
    else if (has(zh,'Adele')) moodTags.push('需要安慰','有点苦恼')
    else if (has(full,'swift','taylor')) moodTags.push('开心开心')
    else if (has(full,'beyoncé','beyonce')) moodTags.push('开心开心')
    else if (has(full,'ariana','grande')) moodTags.push('开心开心','洗澡放松一下')
    else moodTags.push('想一个人发呆')
  }

  // ── energy level ──
  const highEnergy = has(full,
    'party','dance','bang bang','domino','cheap thrills','havana',
    'shape of you','attention','swagger jagger','wasabi','boys','queen',
    'bad romance','savage','mood','pumped','rockstar','up ','young dumb',
    'señorita','now or never','river ','mercy','labour','nexus',
    'supermassive','whip','groovy','feat','remix','live'
  ) || has(zh,
    '开心','再不疯狂','野子','party','PARTY','跳楼机','极恶都市',
    '好想爱这个世界','再不疯狂','恶作剧','PARTY','跳楼机',
    '庆功酒','狂恋','危险派对','大花轿',
  )

  const lowEnergy = has(full,
    'acoustic','piano','slow','sleep','bamboo','valder','hush',
    'easy on me','leave out all','let me down slowly','comethru',
    'love is gone','met at a party','mariage','how do i love thee',
    'i remember','your bones','bamboo','faded','fade','free loop',
    'throwaway','lowkey','bored','ocean of stars','50 feet'
  ) || has(zh,
    '呓语','山丘','水星记','凄美地','兰亭序','雪落下','那时雨',
    '借月','慢冷','消散对白','阿拉斯加海湾','想自由','孤身',
    '小半','秦淮景','琴','墨染','青玉恋','若梦','西楼别序',
  )

  if (highEnergy) energyLevel = '高'
  else if (lowEnergy) energyLevel = '低'
  else energyLevel = '中'

  // ── bestFor ──
  const bestForMap = {
    '想你了':       '适合深夜安静想念某个人的时候听',
    '开心开心':     '适合今天心情特别好、想跟着旋律动起来的时候',
    '今天很幸福':   '适合感到温柔满足、想把这份幸福留住的时候',
    '需要安慰':     '适合心里有点难受、需要一个声音陪着的时候',
    '想被抱抱':     '适合想被人好好抱着、感受温暖的时候',
    '有点苦恼':     '适合心里有点乱、需要安静整理情绪的时候',
    '洗澡放松一下': '适合用热水冲走一天疲惫、什么都不用想的时候',
    '想一个人发呆': '适合一个人安静漂着、思绪飘到哪儿算哪儿的时候',
    '今天有点累':   '适合今天已经很努力了、可以慢慢休息的时候',
  }
  const bestFor = bestForMap[moodTags[0]] || '适合静静独处、感受音乐的时候'

  // ── emotionalDescription — poetic one-line vibe tag ──
  const emoDescMap = {
    '想你了':       '深夜思念感',
    '开心开心':     '轻盈欢快感',
    '今天很幸福':   '温柔幸福感',
    '需要安慰':     '温柔陪伴感',
    '想被抱抱':     '温暖包裹感',
    '有点苦恼':     '淡淡郁结感',
    '洗澡放松一下': '慵懒放松感',
    '想一个人发呆': '安静漂浮感',
    '今天有点累':   '轻柔疗愈感',
  }
  const emotionalDescription = emoDescMap[moodTags[0]] || '情绪流动感'

  // ── romanticReason ──
  const reasons = {
    // Chinese iconic songs
    '薛之谦 - 演员':               '每个人心里都有一个角色，只是不想再演了。',
    '薛之谦 - 暧昧':               '暧昧是比喜欢更难说出口的东西。',
    '薛之谦 - 意外':               '所有的爱都是意外，遇见你也是。',
    '薛之谦 - 绅士':               '最温柔的，是懂得克制的那种爱。',
    '薛之谦 - 动物世界':           '喜欢你这件事，比我想象的还要认真。',
    '薛之谦 - 刚刚好':             '不早不晚，在最对的时候遇见你。',
    '薛之谦 - 你还要我怎样':       '有些话说了不如不说，不说又太难熬。',
    '薛之谦 - 肆无忌惮':           '爱一个人，就是想对他肆无忌惮。',
    '薛之谦 - 一半':               '你占了我的一半，另一半也想给你。',
    '薛之谦 - 丑八怪':             '所有人都看见的东西，有时候才是最美的。',
    '薛之谦 - 最好':               '你就是我想要的最好的那个。',
    '薛之谦 - 下雨了':             '下雨了，只是想问问你有没有带伞。',
    '薛之谦 - 小孩':               '在你面前，我永远只想做个小孩。',
    '薛之谦 - 几个你':             '如果有几个你，每一个都想好好珍惜。',
    '薛之谦 - 方圆几里':           '方圆几里，只要你在，就是全世界。',
    '薛之谦 - 慢半拍':             '我总是慢半拍，但对你，我一直在。',
    '薛之谦 - 深深爱过你(前世)':   '前世深深爱过你，今生还在找你。',
    '薛之谦 - 天份':               '爱你，是我这辈子最好的天分。',
    '薛之谦 - 木偶人':             '不想再假装了，在你面前只想做自己。',
    '薛之谦 - 高尚':               '爱一个人，不需要太多理由。',
    '薛之谦 - 其实':               '其实我一直都知道，只是不敢先说。',
    '薛之谦 - 我知道你都知道':     '有些心意，不用说出口也明白。',
    '薛之谦 - 我好像在哪见过你':   '第一次见你，就觉得你是对的人。',
    '薛之谦 - 我想起你了':         '不经意间，又想起了你。',
    '薛之谦 - 有没有':             '有没有人，会不顾一切地爱你。',
    '薛之谦 - 演员':               '每个人心里都有一个角色，只是不想再演了。',
    '薛之谦 - 我终于成了别人的女人': '那些遗憾，终究只剩一首歌来说。',
    '薛之谦 - 那是你离开了北京的生活': '离开之后才明白，某些人是城市的一部分。',
    '薛之谦 - Stay Here':          '想让你留下来，就这样，什么都不用说。',
    '薛之谦 - 怪咖':               '怪的人遇见怪的人，就是缘分。',
    '薛之谦 - 潮流季':             '流行过了，真心却从未过时。',
    '薛之谦 - 像风一样':           '像风一样把你围绕，让你感觉到我。',
    '林俊杰 - 江南':               '烟雨江南，最适合想一个人。',
    '林俊杰 - 她说':               '有些话，只有音乐说得出口。',
    '林俊杰 - 茉莉雨':             '雨里有你的影子，茉莉香里有你的名字。',
    '林俊杰,蔡卓妍 - 小酒窝':     '你笑起来的样子，是这世界上最好看的。',
    '林俊杰 - 熟能生巧':           '爱一个人久了，连呼吸都成了习惯。',
    '林俊杰 - 记得':               '记得你的每一个细节，一直都记得。',
    '林俊杰 - 我还想她':           '忘不掉，是因为太认真地喜欢过。',
    '周深 - 雪落下的声音 (Live)':  '雪落下来的声音，安静得像你的名字。',
    '周深 - 兰亭序':               '故事写在水里，名字刻在心上。',
    '周深 - 怜悯 (Live)':          '不需要你的怜悯，只需要你的心。',
    '周深 - Monsters (Live)':      '每个人心里都有一只怪兽，被你温柔对待时才安静下来。',
    '陈粒 - 走马':                 '走马观花，唯独你让我停下来。',
    '陈粒 - 小半':                 '你不是全部，你是比全部还多的那一点。',
    '陈粒 - 易燃易爆炸':           '遇见你之前，我不知道自己有多容易着火。',
    '陈粒 - 奇妙能力歌':           '有你的世界，多了一种奇妙的颜色。',
    '陈粒 - 光':                   '你是所有黑暗里透进来的那道光。',
    '陈粒 - 虚拟':                 '现实里难以说出的话，都藏在这首歌里。',
    '毛不易 - 呓语':               '半梦半醒之间，说的都是你。',
    '毛不易 - 像我这样的人':       '像我这样的人，也在认认真真地爱你。',
    '毛不易 - 无问':               '不问从何而来，不问去往何处，只要你在。',
    '毛不易 - 小王日记':           '生活里的小事，都想和你分享。',
    '孙燕姿 - 遇见':               '遇见，是所有故事最好的开头。',
    '孙燕姿 - 开始懂了':           '慢慢懂了，有些人是专门来让你心动的。',
    'G.E.M.邓紫棋 - 光年之外':    '跨越光年，只是为了找到你。',
    'G.E.M.邓紫棋 - 句号':        '有些故事，不想画上句号。',
    'G.E.M.邓紫棋 - 多远都要在一起': '不管多远，都要在一起。',
    '梁静茹 - 勇气':               '爱你，是我做过最勇敢的事。',
    '梁静茹 - 分手快乐':           '爱过了，就够了。',
    '陈奕迅 - 孤独患者':           '孤独的人，需要一首懂他的歌。',
    '陈奕迅 - 浮夸':               '所有的热闹，都是一个人的孤独。',
    '陈奕迅 - 阴天快乐':           '阴天也要快乐，因为你在。',
    '陈奕迅 - 爱情转移(国)':       '把爱情转移，转移到你身上。',
    '郭顶 - 水星记':               '两个人，围绕着彼此转，就像水星记里写的那样。',
    '郭顶 - 凄美地':               '凄美地，有人在等你，有人在爱你。',
    '隔壁老樊 - 别怕 我在':        '别怕，无论什么时候，我都在。',
    '隔壁老樊 - 多想在平庸的生活拥抱你': '就算平凡，也想每天都拥抱你。',
    '隔壁老樊 - 醒着醉':           '想你的感觉，像是清醒着喝醉了。',
    '郁可唯 - 删了吧':             '有些东西舍不得删，因为里面有你。',
    '郁可唯 - 水中花':             '水中花，镜中月，明知触碰不到还是伸出手。',
    '单依纯 - 想你时风起':         '风一起，就想起你了。',
    '单依纯 - 爱的回归线 (Live版)':'绕了一圈，还是回到你身边。',
    '单依纯 - 下雨天 (Live)':      '下雨天，最想听的声音是你的名字。',
    '单依纯 - 给电影人的情书 (Live)': '每一帧都像是在写给你的情书。',
    '单依纯 - 踮起脚尖爱 (Live版)':'踮起脚尖，努力去触碰你。',
    '那英 - 默':                   '有些心情，只有沉默才说得清。',
    '那英 - 梦一场':               '如果是梦，希望梦里一直有你。',
    '张杰 - 我们都一样':           '你不孤单，我们都一样在认真生活。',
    '张杰 - 他不懂':               '他不懂你，但我懂。',
    '张杰 - 夜空中最亮的星 (Live)':'你是我夜空中最亮的那颗星。',
    '张杰 - 今生今世':             '今生今世，只认你一个。',
    '张杰 - 着魔':                 '遇见你，就像被你施了魔法。',
    '张杰 - 明天过后':             '无论明天之后是什么，今晚我都想陪着你。',
    '张杰 - 最接近天堂的地方':     '有你的地方，就是最接近天堂的地方。',
    '张芸京 - 偏爱':               '偏偏是你，让我偏爱到无法自拔。',
    '苏运莹 - 野子':               '野子，自由而真实，像极了你的眼神。',
    '王贰浪 - 往后余生':           '往后余生，都想和你一起过。',
    '王贰浪 - 盔甲':               '你是我最软的心，也是我最硬的盔甲。',
    '王贰浪 - 你也没有错':         '你没有错，只是我们的缘分到了。',
    '八三夭 - 想见你想见你想见你': '想见你，想见你，想见你。',
    '逃跑计划 - 夜空中最亮的星':   '夜空再黑，你是最亮的那一颗。',
    '鬼卞 - 只想要你知道':         '只想让你知道，我认真地喜欢过你。',
    '鬼卞 - 佳人':                 '佳人，是你在我眼里永远的样子。',
    '鬼卞,房东的猫 - 蝴蝶效应':   '遇见你，改变了所有。',
    '鬼卞 - 与你何涉':             '与你有关的一切，都与我有关。',
    '鬼卞 - 雌雄难辨':             '有时候爱一个人，分不清是你还是我先动心。',
    '李荣浩 - 年少有为':           '年少时的我，没想到会这么喜欢你。',
    '李荣浩 - 我看着你的时候':     '看着你，就什么都不用说了。',
    '张信哲 - 爱如潮水':           '爱如潮水，一浪接一浪地涌向你。',
    '莫文蔚 - 阴天':               '阴天不代表没有阳光，只是躲起来了。',
    '莫文蔚 - 如果没有你':         '如果没有你，我就不完整了。',
    '梁咏琪 - 短发':               '剪了短发，是为了新的开始。',
    '张宇 - 雨一直下':             '雨一直下，思念一直在。',
    '陶喆 - 爱我还是他':           '你的心里，真的只有我吗？',
    '周传雄 - 黄昏':               '黄昏时刻，最想牵着你的手。',
    '周兴哲 - 永不失联的爱':       '不管走多远，爱你这件事永远不断线。',
    '徐佳莹 - 一样的月光':         '同一片月光下，思念的是同一个你。',
    '徐佳莹 - 一样的月光 (Live)':  '同一片月光下，思念的是同一个你。',
    '黄丽玲 - 幸福了 然后呢':      '幸福了，然后呢？然后更幸福。',
    '黄丽玲 - 有一种悲伤':         '有一种悲伤，叫做明明爱你却说不出口。',
    '黄丽玲 - 失恋无罪':           '爱过了，输了也不是罪。',
    '李宗盛 - 给自己的歌':         '认真地活过，认真地爱过，就够了。',
    '李宗盛 - 鬼迷心窍':           '被你迷住，无法自拔。',
    '萧亚轩 - 错的人':             '错的时间遇见对的人，是心里最深的遗憾。',
    '柏松 - 世间美好与你环环相扣': '所有美好，都和你连在一起。',
    '张钰琪 - 陪你度过漫长岁月':   '漫长岁月里，你是最温柔的那部分。',
    '枯木逢春 - 这一生关于你的风景': '这一生，最美的风景，是你。',
    '沈以诚 - 好奇':               '好奇你想的是什么，好奇你的一切。',
    '满舒克 - 慢热':               '慢热的人爱起来，更加认真。',
    '颜人中 - 遇到':               '遇到你，是所有巧合里最好的一个。',
    '颜人中 - 晚安':               '晚安，愿你在梦里也被温柔对待。',
    '颜人中 - 下一个天亮':         '等到下一个天亮，还是会想起你。',
    '高旭 - 不做你的朋友':         '不想做你的朋友，只想做你最重要的人。',
    '王天阳 - 借月':               '借一轮明月，把思念带给你。',
    '蓝心羽 - 阿拉斯加海湾':       '有些感情，像阿拉斯加的海湾，辽阔又安静。',
    '刘可以 - 阿拉斯加海湾':       '把思念放在阿拉斯加的海湾，任它漂流。',
    '于文文 - 奉陪':               '你的每一段路，我都愿意奉陪。',
    '于潼 - 寂寞沙洲冷':           '寂寞的时候，有这首歌陪着你。',
    '陈柏宇 - 行尸走肉':           '遇见你之前，不知道自己只是行尸走肉。',
    '戚薇 - 如果爱忘了':           '有些爱，忘不了，就也别勉强忘。',
    '井胧 - 丢了你':               '丢了你，才知道有多重要。',
    '曲肖冰 - 天亮以前说再见':     '天亮以前，把所有想说的都说了。',
    '枯木逢春 - 这一生关于你的风景': '这一生，最美的风景，是你。',
    '韩红,孙楠 - 美丽的神话':     '爱是一个美丽的神话，你让它变成真实。',
    '曹格,卓文萱 - 梁山伯与茱丽叶':'隔了时空，爱还是爱。',
    '段弋,hanji - 223\'s':         '两个人，两百二十三个秘密。',
    'Ed Sheeran - Perfect':        '你就是那个完美的人。',
    'Ed Sheeran - Shape of You':   '形状不同，偏偏契合在一起。',
    'Adele - Easy On Me':          '对我温柔一点，就像这首歌一样。',
    'The Chainsmokers,Coldplay - Something Just Like This': '不需要超级英雄，只想要这样的你。',
    'Taylor Swift - Cruel Summer': '残忍的夏天，因为你而变得值得。',
    'Anthem Lights,Megan Davies - A Thousand Years': '等你，等了一千年。',
    'Anthem Lights - As Long as You Love Me': '只要你爱我，就什么都够了。',
    'Camila Cabello - This Love':  '这份爱，一直都在。',
    'Lukas Graham - 7 Years':      '七岁时的梦想，长大后你出现了。',
    'Alan Walker - Faded':         '消失在人群里，但对你来说，我一直都在。',
    'OneRepublic - Apologize':     '有些遗憾，只能用音乐来表达。',
    'Owl City - Enchanted':        '遇见你那一刻，我被彻底迷住了。',
    'SLANDER,Dylan Matthew - Love Is Gone (Acoustic)': '爱消散了，但曾经有过，就值得。',
    'Jeremy Zucker,Bea Miller - comethru': '深夜里，希望你能过来陪我。',
    'Boyce Avenue - Someone You Loved': '被你爱过，是这辈子最幸运的事。',
    'Tamas Wells - Valder Fields': '有你的地方，才是我想去的地方。',
    'Bruno Major - Easily':        '爱上你，太容易了，轻而易举就沦陷了。',
    'Lauv - Love Somebody':        '想爱一个人，想爱得很认真。',
    'Michael Hoppé - How Do I Love Thee': '用所有能想到的方式，爱你。',
    'Tamas Wells - Valder Fields': '有你的地方，才是我想去的地方。',
    'Richard Clayderman - Mariage d\'amour (Paul de Senneville)': '爱情的旋律，只需要钢琴就足够了。',
    'Ariana Grande,Justin Bieber - Stuck with U': '被困在和你在一起的时光里，甘之如饴。',
    'Westlife - Seasons In The Sun': '那些阳光灿烂的日子，是因为你在。',
    'MOCCA - I Remember':          '我记得，每一个关于你的瞬间。',
    'Chris Medina - What Are Words': '只要你在，什么语言都不需要。',
    'Anson Seabra - Keep Your Head Up Princess': '抬起头，你值得最好的一切。',
    'Powfu,Kuzu Mellow - met at a party': '在最普通的地方相遇，却是最特别的故事。',
    'Sasha Alex Sloan - Dancing With Your Ghost': '你不在了，但那支舞我还记得。',
    'Savage Ga$p - an ocean of stars couldn\'t keep us apart': '整片星海，也拦不住我找到你的心。',
  }

  const key = `${artist} - ${title}`
  const romanticReason = reasons[key]
    || genericReason(moodTags[0], energyLevel)

  return {
    title,
    artist,
    // Raw path — resolveSongUrl() in songConfig.js encodes this at runtime.
    src: `/songs/${filename}`,
    moodTags: [...new Set(moodTags)],
    energyLevel,
    emotionalDescription,
    bestFor,
    romanticReason,
  }
}

function genericReason(mood, energy) {
  const pool = {
    '想你了': [
      '这首歌，适合在深夜安静想念某个人。',
      '旋律里藏着所有没说出口的想念。',
      '有些音乐，一响起就让人想到那个人。',
      '深夜听这首，脑海里浮现的是谁？',
      '这首歌懂你，就像懂得想念是什么感觉。',
    ],
    '开心开心': [
      '今天心情好，就配这首。',
      '听这首歌，连步伐都会变得轻盈。',
      '快乐的旋律，是最好的礼物。',
      '跟着节拍动起来，今天属于你。',
      '这首歌的能量，跟你今天一样耀眼。',
    ],
    '今天很幸福': [
      '幸福的感觉，就是这首歌的温度。',
      '把这份满足感留住，就像这首歌的旋律。',
      '有你在的每一天，都值得一首这样的歌。',
      '温柔的旋律，配上幸福的心情，刚刚好。',
      '这首歌，献给今天的好心情。',
    ],
    '需要安慰': [
      '没关系，这首歌陪着你。',
      '让音乐替你说出那些说不出口的话。',
      '有时候不需要解释，只需要一首好歌。',
      '这首歌像一个温柔的拥抱，送给你。',
      '一切都会好的，先听着这首歌。',
    ],
    '想被抱抱': [
      '这首歌，就像一个温暖的拥抱。',
      '听着这首，闭上眼睛，感受被爱的温度。',
      '有人在想着你，隔着音符传递温暖。',
      '软软的旋律，就是今晚最好的陪伴。',
      '听这首歌，好像真的有人在身边。',
    ],
    '有点苦恼': [
      '没关系，苦恼也是一种感受。',
      '让这首歌帮你整理一下心情。',
      '有些事想不明白，听听歌再说。',
      '音乐懂你，就算说不清楚也没关系。',
      '这首歌，安静地陪着你想事情。',
    ],
    '洗澡放松一下': [
      '用这首歌冲走今天所有的疲惫。',
      '热水加上好音乐，今晚好好放松。',
      '什么都不用想，就跟着旋律漂一会儿。',
      '这首歌，专为今晚的放松时光准备。',
      '轻轻松松，就这样享受今晚的安静。',
    ],
    '想一个人发呆': [
      '一个人静静的，这首歌最配。',
      '漂着漂着，思绪就到了你想去的地方。',
      '慢下来，什么都不想，只是感受音乐。',
      '这首歌的节奏，就是今晚你的呼吸频率。',
      '深夜一个人，有这首歌就够了。',
    ],
    '今天有点累': [
      '今天已经很努力了，好好休息。',
      '软软的旋律，帮你放下今天的重量。',
      '什么都不用再做了，听着这首慢慢来。',
      '这首歌，是今晚对你最温柔的告别。',
      '你已经很好了，让音乐陪你休息。',
    ],
  }
  const arr = pool[mood] || pool['想一个人发呆']
  // simple deterministic pick
  return arr[0]
}

// ── generate ────────────────────────────────────────────────────────────────

const songs = files.map(f => classify(f))

const lines = songs.map(s => `  {
    title: ${JSON.stringify(s.title)},
    artist: ${JSON.stringify(s.artist)},
    src: ${JSON.stringify(s.src)},
    moodTags: ${JSON.stringify(s.moodTags)},
    energyLevel: ${JSON.stringify(s.energyLevel)},
    emotionalDescription: ${JSON.stringify(s.emotionalDescription)},
    bestFor: ${JSON.stringify(s.bestFor)},
    romanticReason: ${JSON.stringify(s.romanticReason)},
  }`)

const output = `// Auto-generated — run: node scripts/generateSongMoodMap.js
// Song fields: title, artist, src (local /songs/ path), moodTags, energyLevel,
//              emotionalDescription, bestFor, romanticReason
// To switch to CDN: set CDN_BASE in src/data/songConfig.js
export const songMoodMap = [\n${lines.join(',\n')}\n]\n`

const outPath = new URL('../src/data/songMoodMap.js', import.meta.url)
fs.writeFileSync(outPath, output, 'utf8')
console.log(`✓ wrote ${songs.length} songs to src/data/songMoodMap.js`)

// Also write JSON for the lazy-loading hook (public/data/songLibrary.json)
const jsonDir = new URL('../public/data', import.meta.url)
fs.mkdirSync(jsonDir, { recursive: true })
const jsonOutPath = new URL('../public/data/songLibrary.json', import.meta.url)
fs.writeFileSync(jsonOutPath, JSON.stringify(songs))
console.log(`✓ wrote ${songs.length} songs to public/data/songLibrary.json`)
