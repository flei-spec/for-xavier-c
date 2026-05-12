// Classify ONLY newly added songs and merge into songMoodMap.js + songLibrary.json
// Preserves all existing curated metadata, only appends new entries.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const SONGS_DIR = path.resolve(__dirname, '../public/songs')
const MOOD_MAP_PATH = path.resolve(__dirname, '../src/data/songMoodMap.js')
const LIBRARY_JSON_PATH = path.resolve(__dirname, '../public/data/songLibrary.json')

// ── Parse existing library to find what's already there ───────────────────────
const libraryData = JSON.parse(fs.readFileSync(LIBRARY_JSON_PATH, 'utf8'))
const existingSrcs = new Set(libraryData.map(s => s.src))

// ── Find new files ────────────────────────────────────────────────────────────
const allFiles = fs.readdirSync(SONGS_DIR).filter(f => /\.mp3$/i.test(f)).sort()
const newFiles = allFiles.filter(f => !existingSrcs.has(`/songs/${f}`))

if (newFiles.length === 0) {
  console.log('No new songs found. All 499 files are already in the library.')
  process.exit(0)
}

console.log(`Found ${newFiles.length} new song(s) to classify:\n`)
newFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))
console.log()

// ── Classification logic (mirrors generateSongMoodMap.js) ─────────────────────

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
  const zh = artist + ' ' + title

  const moodTags = []

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
    'Easy On Me','Easy on me','边一个发明了ENCORE','南屏晚钟',
  ) ||
  has(full,
    'missing','gone','goodbye','leave','left me','without you',
    'let me down','someone you loved','love is gone','let somebody go',
    'dancing with your ghost','easy on me','apologize','seasons in the sun',
    'bleeding love','not afraid','love the way you lie','nothing like us',
    'come around me','mark my words','die in your arms','never let you go',
    'let it go','how do i love thee','i remember','your bones',
    'valder fields','long way home','comethru','lowkey','your ghost',
    'an ocean of stars','leave out all the rest','i love you 3000',
    'visions of gideon','mystery of love','strawberries','stuck on you',
    'la la lost you','shouldn\'t couldn\'t wouldn\'t','strange land',
    'tequila sunrise','oscar winning tears','kiss it better',
    'die with a smile','luther','sweet spot','devotion','walking away',
    'all i can take','need it','love song','daisies',
  )) moodTags.push('想你了')

  // ── 想被抱抱 ──
  if (has(zh,
    '别怕 我在','多想在平庸','抱我','拥抱','蔡徐坤','hug me','Hug me',
    '隔壁老樊','下辈子如果','盔甲','靠着你','在你的身边','美丽的神话',
    '追寻你','借月','永不失联的爱','往后余生','柏松','世间美好',
    '狐狸的童话','在一起',
  ) ||
  has(full,
    'hug','hold me','stay','beside me','together','arms around',
    'need you here','close to me','a thousand years','as long as you love me',
    'never let you go','stuck with u','something just like this',
    'enchanted','good times','love somebody','love me like you do',
    '10,000 hours','10000 hours','devotion','butterflies',
    'the joker','bad honey',
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
    '枯木逢春','这一生关于你的风景','蔡琴 - 张三的歌',
    '只要你開心','在一起嘛好不好','April Encounter',
    '我喜欢上你时的内心活动','吻你吻上太空','明天会营业',
  ) ||
  has(full,
    'perfect','wonderful','best part','golden','from the start',
    'valentine','lovesick','bloom','good days','all of me',
    'thinking out loud','beautiful','magical','wonderful u',
    'a thousand years','love me like you do','peaches','sleepyhead',
    'mariage d\'amour','new soul','bamboo','how do i love thee',
    'i love you 3000','die with a smile','calculator','love song',
    'joker and the queen',
  )) moodTags.push('今天很幸福')

  // ── 开心开心 ──
  if (has(zh,
    '开心','快乐','野子','再不疯狂','恶作剧','古巨基','必杀技',
    '小酒窝','李宇春','再不疯狂','苏运莹','坤木Joymo','PARTY',
    '李荣浩','年少有为','贰佰','玫瑰','明天过后','隔壁老樊','醒着醉',
    '跳楼机','特别的人','雨爱','小乐哥','大眠','呆呆破',
    '周星星','高旭','不做你的朋友','拍拍灰','玫瑰少年',
    '爱人错过','南屏晚钟',
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
    'take it all in','chillin','wassuh','nomo','tease',
    '405','bad honey','speed demon','yukon','witchya',
    'eye candy','butterflies','sweet spot','calculator',
    'tequila sunrise','hey kong','更好的曼',
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
    '一个人想着一个人','听，我的噩梦','传闻','相安无事',
    '我的灵魂是个哑巴','我们打着光脚',
  ) ||
  has(full,
    'easy on me','someone you loved','comfort','it\'s okay','don\'t cry',
    'make it through','hang on','keep your head up','sad','lonely',
    'heartbreak','broken','crying','hurt','pain','heal',
    'leave out all the rest','your bones','let it go',
    'apologize','seasons in the sun','long way home',
    'let me down slowly','dancing with your ghost',
    'love is gone','pray','bad day','i\'m with you',
    'innocence','bleeding love','all i can take','need it',
    'oscar winning tears',
  )) moodTags.push('需要安慰')

  // ── 有点苦恼 ──
  if (has(zh,
    '演员','易燃易爆炸','出卖','怪咖','木偶人','几个你','有一种悲伤',
    '那是你离开了北京','暗巷','肆无忌惮','你还要我怎样','我终于成了',
    '死性不改','答应不爱你','陶喆','爱我还是他','错的人','谁又不是',
    '不跟你好了','我要吃泡芙','BigYear','简弘亦','张碧晨','笼',
    '雌雄难辨','鬼卞','佳人','阿冗','与我无关','高旭','不做你的朋友',
    '夏日入侵企画','极恶都市','Jony J','暗巷','最佳损友',
    '梦外的婚礼','句号','Hey KONG',
  ) ||
  has(full,
    'confused','trouble','complicated','bored','lie to me',
    'if i were a boy','strange','dark','frustrated','lost',
    'decode','supermassive','strangers','in disguise',
    'black sheep','labour','prey','nexus','river','mercy',
    'therefore i am','bad guy','now or never','you so done',
    'omen','ex ','ex,','kiana','shouldn\'t couldn\'t wouldn\'t',
    'kiss it better','luther',
  )) moodTags.push('有点苦恼')

  // ── 洗澡放松一下 ──
  if (has(zh,
    '逍遥','野子','奇妙能力歌','光','虚拟','风月','梦','飘','悠',
    '风的颜色','炫动小霸王','墨染','新诚觉一','青玉恋','陈其钢','秦淮景',
    '王源','友谊地久天长','胡儆之Jinzy','逍遥','Piano',
    '所念皆星河','李宇春','蜀绣','尹昔眠','西楼别序',
    '葛东琪','囍','乐乐','辞家千里','李宗盛','给自己的歌',
    '狐狸的童话','等你的季节','湖','春','情话','距离',
    '南屏晚钟',
  ) ||
  has(full,
    'relax','chill','easy','smooth','acoustic','piano','bamboo',
    'valder','sleepyhead','dreamy','soft','float','lazy',
    'mariage','classical','lofi','lo-fi','ambient','mellow',
    'galway girl','new soul','free loop','long way home',
    'summertrain','enchanted','easily','throwaway','met at a party',
    'bored','pasta','hush','lowkey','tease','chillin',
    'la la lost you','strange land','visions of gideon',
    'mystery of love','strawberries','april encounter',
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
    '盛哲','在你的身边','王天阳','借月','虚拟','一个人想着一个人',
    '我的灵魂是个哑巴','我们打着光脚','听，我的噩梦','拍拍灰',
    '传闻','相安无事','等你的季节','距离','情话','湖','春',
  ) ||
  has(full,
    'slow','dream','night','alone','quiet','wander','drift',
    'valder fields','your bones','of monsters','an ocean of stars',
    'met at a party','love is gone','darkness','shadow',
    'your ghost','dancing with','faded','hush','throwaway',
    'free loop','supermassive','decode','leave out all the rest',
    'i remember','mocca','how do i love thee','50 feet',
    'la la lost you','strange land','visions of gideon',
    'mystery of love','strawberries','stuck on you',
    'shouldn\'t couldn\'t wouldn\'t',
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
    '南屏晚钟','最佳损友',
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
    'slander','comethru','walking away','all i can take',
    'visions of gideon',
  )) moodTags.push('今天有点累')

  // ── fallback ──
  if (moodTags.length === 0) {
    if (has(zh, 'Justin Bieber', 'Justin')) moodTags.push('开心开心', '想被抱抱')
    else if (has(zh, 'Adele')) moodTags.push('需要安慰', '想你了')
    else if (has(full, 'swift', 'taylor')) moodTags.push('开心开心')
    else if (has(full, 'beyoncé', 'beyonce')) moodTags.push('开心开心')
    else if (has(full, 'ariana', 'grande')) moodTags.push('开心开心', '洗澡放松一下')
    else if (has(full, '88rising')) moodTags.push('洗澡放松一下', '想你了')
    else if (has(full, 'kendrick', 'sza')) moodTags.push('有点苦恼', '想你了')
    else if (has(full, 'lady gaga', 'bruno mars')) moodTags.push('今天很幸福', '想你了')
    else if (has(zh, 'G.E.M', '句号')) moodTags.push('有点苦恼', '想你了')
    else if (has(zh, '张三的歌')) moodTags.push('今天很幸福', '洗澡放松一下')
    else if (has(zh, '梦外的婚礼')) moodTags.push('有点苦恼', '想你了')
    else moodTags.push('想一个人发呆')
  }

  // ── energy level ──
  const highEnergy = has(full,
    'party','dance','bang bang','domino','cheap thrills','havana',
    'shape of you','attention','swagger jagger','wasabi','boys','queen',
    'bad romance','savage','mood','pumped','rockstar','up ','young dumb',
    'señorita','now or never','river ','mercy','labour','nexus',
    'supermassive','whip','groovy','feat','remix','live',
    '405','speed demon','yukon','witchya','eye candy',
    'calculator','tequila sunrise','hey kong','bad honey',
    '玫瑰少年','爱人错过',
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
    'throwaway','lowkey','bored','ocean of stars','50 feet',
    'la la lost you','strange land','visions of gideon',
    'mystery of love','strawberries','walking away','need it',
    'all i can take',
  ) || has(zh,
    '呓语','山丘','水星记','凄美地','兰亭序','雪落下','那时雨',
    '借月','慢冷','消散对白','阿拉斯加海湾','想自由','孤身',
    '小半','秦淮景','琴','墨染','青玉恋','若梦','西楼别序',
    '我的灵魂是个哑巴','听，我的噩梦','等你的季节',
    '一个人想着一个人','南屏晚钟',
  )

  let energyLevel = '中'
  if (highEnergy) energyLevel = '高'
  else if (lowEnergy) energyLevel = '低'

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

  // ── emotionalDescription ──
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
  const customReasons = {
    '蔡琴 - 南屏晚钟 (Remastered)': '晚钟响起的时候，想起的都是你。',
    '陈文非 - 春': '春天来了，所有美好的事都藏着你的名字。',
    '陈粒 - 虚拟': '现实里难以说出的话，都藏在这首歌里。',
    '余佳运 - 距离': '再远的距离，也挡不住想靠近的心。',
    '余佳运 - 情话': '所有的情话，不如这一首歌来得真诚。',
    '周柏豪 - 传闻': '有些故事被传来传去，只有我知道是真的。',
    '蔡琴 - 张三的歌': '平凡人的爱情，就是最动人的歌。',
    '脏饼干 - 拍拍灰': '拍拍身上的灰，继续往前走。',
    '五月天 - 玫瑰少年': '不一样的灵魂，一样值得被爱。',
    '周柏豪 - 相安无事': '最好的结局，莫过于相安无事。',
    '告五人 - 爱人错过': '错过的人，变成了歌里的回忆。',
    '陈奕迅 - 最佳损友': '最好的朋友，也是最好的回忆。',
    '蔡忠慈 - 梦外的婚礼': '梦里梦外，都是你。',
    '刘诗诗 - 等你的季节': '每个季节都在等你，等了很久很久。',
    '曾舜晞 - 吻你吻上太空': '想把你吻到太空，让全世界都知道我爱你。',
    '李荣浩 - 在一起嘛好不好': '简单的一句话，装满了期待。',
    '曾沛慈 - 一个人想着一个人': '一个人的时候，最想另一个人。',
    '陈绮贞 - 我喜欢上你时的内心活动': '喜欢你的时候，心里翻来覆去都是你。',
    '很美味 - April Encounter': '四月遇见你，从此四季都变得不一样了。',
    '周子洋,仔仔 - 我的灵魂是个哑巴': '心里有话，却说不出口。',
    '等一下就回家,-艾兜 - 我们打着光脚在风车下跑，手上的狗尾巴草摇啊摇': '最简单的快乐，是有你在身边。',
    '陈壹千,嘻哈研究生,Airdream - 听，我的噩梦': '在噩梦里，也想听见你的声音。',
    '88rising,王嘉尔,Higher Brothers - Tequila Sunrise (feat. AUGUST 08 & Goldlink)': '日出时刻的微醺，像第一次遇见你的感觉。',
    '88rising,AUGUST 08,Barney Bones - Calculator': '算来算去，算不过心动。',
    '88rising,NIKI - La La Lost You (Acoustic Version)': '丢了你的感觉，像丢了歌里的旋律。',
    '88rising,NIKI,Phum Viphurit - Strange Land (Acoustic Version)': '在陌生的地方，想到的都是熟悉的你。',
    '88rising,NIKI,Rich Brian - Shouldn\'t Couldn\'t Wouldn\'t (Acoustic Version)': '所有的不应该，都是因为放不下。',
    '88rising,Stephanie Poetri,王嘉尔 - I Love You 3000 II': '我爱你三千遍，一遍比一遍多。',
    'Adele - Easy On Me': '对我温柔一点，就像这首歌一样。',
    'CJ周密 - 明天会营业': '明天，还是会照常想你。',
    'Dan + Shay,Justin Bieber - 10,000 Hours': '一万个小时，只想用来了解你。',
    'Ed Sheeran,Taylor Swift - The Joker And The Queen (feat. Taylor Swift)': '小丑和王后，偏偏是最好的一对。',
    'G.E.M.邓紫棋 - 句号': '有些故事，不想画上句号。',
    'GIVĒON - Stuck On You': '粘在你身上，不想离开。',
    'HENRY刘宪华 - 可是我爱你': '可是我爱你，这就够了。',
    'JOYCE 就以斯 - 只要你開心': '只要你开心，什么都值得。',
    'Justin Bieber - 405': '405号公路上，想的是你。',
    'Justin Bieber - ALL I CAN TAKE': '能撑住的，都是为了你。',
    'Justin Bieber - BAD HONEY': '甜蜜的事，不一定都是好的。',
    'Justin Bieber - BETTER MAN': '因为你，想成为更好的人。',
    'Justin Bieber - BUTTERFLIES': '每次见你，心里都有蛔蝶在飞。',
    'Justin Bieber - DAISIES': '雏菊花海，都不如你。',
    'Justin Bieber - EYE CANDY': '你是所有目光里最好看的那一个。',
    'Justin Bieber - LOVE SONG': '所有情歌，都是为你写的。',
    'Justin Bieber - NEED IT': '不需要很多，只需要你。',
    'Justin Bieber - SPEED DEMON': '爱上你的速度，比什么都快。',
    'Justin Bieber - WALKING AWAY': '转身离开，是最难的事。',
    'Justin Bieber - WITCHYA': '和你在一起，一切都对。',
    'Justin Bieber - YUKON': 'YUKON的冬天，不如你的温暖。',
    'Justin Bieber,Dijon - DEVOTION': '执着的爱，一生一次就够了。',
    'Justin Bieber,Sexyy Red - SWEET SPOT': '那个甜蜜的位置，刚好是你。',
    'Kendrick Lamar,SZA - luther': '有些旋律，一听就放不下。',
    'KEY.L刘聪,c0de731 - Hey KONG': 'Hey KONG，有些话想说给你听。',
    'Lady Gaga,Bruno Mars - Die With A Smile': '就算是最后一天，也要笑着想你。',
    '李棒棒Muti - 湖': '心事沉在湖底，上面平静无波。',
    'RAYE - Oscar Winning Tears': '那些眼泪，值得最好的戏。',
    'Rihanna - Kiss It Better': '有些伤，亲吻就能愈合。',
    'Santa_SA,马也_Crabbit - 狐狸的童话': '狐狸的童话，说的是你的故事。',
    'Sufjan Stevens - Mystery of Love': '爱是最大的谜，永远解不完。',
    'Sufjan Stevens - Visions of Gideon': '那些幻象里，都是你的影子。',
    'Troye Sivan - Strawberries & Cigarettes': '草莓和香烟，甜中带涩。',
  }

  const key = `${artist} - ${title}`
  const romanticReason = customReasons[key] || genericReason(moodTags[0])

  // Remove duplicates from moodTags
  const uniqueMoodTags = [...new Set(moodTags)]

  return {
    title,
    artist,
    src: `/songs/${filename}`,
    moodTags: uniqueMoodTags,
    energyLevel,
    emotionalDescription,
    bestFor,
    romanticReason,
  }
}

function genericReason(mood) {
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
  return arr[0]
}

// ── Classify new songs ─────────────────────────────────────────────────────────
const newSongs = newFiles.map(f => classify(f))
console.log('Classification results:\n')
newSongs.forEach(s => {
  console.log(`  ${s.artist} - ${s.title}`)
  console.log(`    moods: [${s.moodTags.join(', ')}] | energy: ${s.energyLevel} | vibe: ${s.emotionalDescription}`)
  console.log(`    reason: ${s.romanticReason}`)
  console.log()
})

// ── Merge into songMoodMap.js ──────────────────────────────────────────────────
const moodMapContent = fs.readFileSync(MOOD_MAP_PATH, 'utf8')

// Build new entries as JS string
const newEntries = newSongs.map(s => `  {
    title: ${JSON.stringify(s.title)},
    artist: ${JSON.stringify(s.artist)},
    src: ${JSON.stringify(s.src)},
    moodTags: ${JSON.stringify(s.moodTags)},
    energyLevel: ${JSON.stringify(s.energyLevel)},
    emotionalDescription: ${JSON.stringify(s.emotionalDescription)},
    bestFor: ${JSON.stringify(s.bestFor)},
    romanticReason: ${JSON.stringify(s.romanticReason)},
  }`).join(',\n')

// Find insertion point: right before the closing `]`
const closingBracket = moodMapContent.lastIndexOf(']')
if (closingBracket === -1) {
  console.error('Could not find closing bracket in songMoodMap.js')
  process.exit(1)
}

const newMoodMap = moodMapContent.slice(0, closingBracket) + ',\n' + newEntries + '\n]'

fs.writeFileSync(MOOD_MAP_PATH, newMoodMap, 'utf8')
console.log(`✓ Appended ${newSongs.length} songs to src/data/songMoodMap.js`)

// ── Merge into songLibrary.json ────────────────────────────────────────────────
const updatedLibrary = [...libraryData, ...newSongs]
fs.writeFileSync(LIBRARY_JSON_PATH, JSON.stringify(updatedLibrary, null, 2), 'utf8')
console.log(`✓ Updated public/data/songLibrary.json (now ${updatedLibrary.length} songs)`)
console.log(`\nDone! Added ${newSongs.length} new songs. Total: ${updatedLibrary.length}`)
