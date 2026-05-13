#!/usr/bin/env node
/**
 * classifyAllSongs.js — Full emotional reclassification of the entire library.
 *
 * Three-layer classification:
 *   Layer 1 — Artist knowledge base (emotional profiles for ~120 artists)
 *   Layer 2 — Title/subject keyword expansion (~200+ keywords per mood)
 *   Layer 3 — Derived emotional scores (intensity, warmth, solitude, night)
 *
 * Writes: src/data/songMoodMap.js  +  public/data/songLibrary.json
 *
 * Usage: node scripts/classifyAllSongs.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SONGS_DIR = path.resolve(__dirname, '../songs_static')
const MOOD_MAP_PATH = path.resolve(__dirname, '../src/data/songMoodMap.js')
const LIBRARY_JSON_PATH = path.resolve(__dirname, '../public/data/songLibrary.json')

// ── Parse helpers ──────────────────────────────────────────────────────────
function parseName(filename) {
  const base = filename.replace(/\.mp3$/i, '')
  const dash = base.indexOf(' - ')
  if (dash !== -1) return { artist: base.slice(0, dash).trim(), title: base.slice(dash + 3).trim() }
  return { artist: '', title: base.trim() }
}

const has = (text, ...terms) => terms.some(t => text.includes(t))
const hasAny = (text, terms) => terms.some(t => text.includes(t))

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1 — Artist Knowledge Base
// ═══════════════════════════════════════════════════════════════════════════
//
// Each profile: { moods, intensity, warmth, solitude, night, style }
//   moods     — default mood tags for unknown songs by this artist
//   intensity — base emotional intensity (1-10)
//   warmth    — vocal/instrumental warmth (1-10)
//   solitude  — solitary listening suitability (1-10)
//   night     — late-night listening score (1-10)
//   style     — descriptive tag for scoring adjustments

const ARTIST_PROFILES = {

  // ── Chinese: Ballad / Love Song Masters ──────────────────────────────
  '薛之谦':     { moods:['想你了','有点苦恼','需要安慰'], intensity:8, warmth:5, solitude:8, night:9, style:'poetic heartbreak' },
  '张宇':       { moods:['想你了','需要安慰','有点苦恼'], intensity:8, warmth:5, solitude:8, night:9, style:'dramatic ballad' },
  '张信哲':     { moods:['想你了','今天很幸福'], intensity:7, warmth:7, solitude:7, night:8, style:'romantic ballad' },
  '林俊杰':     { moods:['今天很幸福','想你了','想被抱抱'], intensity:7, warmth:8, solitude:6, night:7, style:'soaring romantic' },
  '周兴哲':     { moods:['想你了','想被抱抱','今天很幸福'], intensity:6, warmth:8, solitude:7, night:8, style:'tender ballad' },
  '王力宏':     { moods:['想你了','今天很幸福'], intensity:6, warmth:7, solitude:6, night:7, style:'classic romantic' },
  '陶喆':       { moods:['有点苦恼','想你了'], intensity:7, warmth:6, solitude:7, night:8, style:'R&B ballad' },
  '陈奕迅':     { moods:['想一个人发呆','有点苦恼','需要安慰'], intensity:7, warmth:6, solitude:8, night:9, style:'melancholic narrative' },
  '李荣浩':     { moods:['有点苦恼','想你了','想一个人发呆'], intensity:6, warmth:5, solitude:8, night:8, style:'understated ballad' },
  '萧敬腾':     { moods:['想你了','需要安慰'], intensity:8, warmth:5, solitude:7, night:8, style:'rock ballad' },
  '曹格':       { moods:['想你了','需要安慰'], intensity:7, warmth:6, solitude:7, night:8, style:'emotional ballad' },
  '杨培安':     { moods:['想你了','需要安慰'], intensity:8, warmth:6, solitude:7, night:8, style:'power ballad' },
  '郑源':       { moods:['想你了','需要安慰'], intensity:7, warmth:6, solitude:8, night:9, style:'heartbreak ballad' },
  '郑中基':     { moods:['想你了','有点苦恼'], intensity:6, warmth:6, solitude:7, night:8, style:'classic ballad' },
  '庾澄庆':     { moods:['今天很幸福','想你了'], intensity:6, warmth:7, solitude:6, night:7, style:'warm ballad' },
  '周华健':     { moods:['今天很幸福','想你了'], intensity:5, warmth:8, solitude:6, night:7, style:'classic warm' },
  '张远':       { moods:['想你了','想被抱抱'], intensity:6, warmth:7, solitude:7, night:8, style:'tender ballad' },
  '丁当':       { moods:['想你了','需要安慰'], intensity:7, warmth:6, solitude:7, night:8, style:'power ballad' },
  '品冠':       { moods:['今天很幸福','想被抱抱'], intensity:5, warmth:9, solitude:6, night:7, style:'gentle ballad' },
  '光良':       { moods:['今天很幸福','想你了'], intensity:5, warmth:8, solitude:6, night:7, style:'fairy tale ballad' },

  // ── Chinese: Female Ballad / Emotional ────────────────────────────────
  'G.E.M.邓紫棋': { moods:['想你了','有点苦恼','需要安慰'], intensity:8, warmth:6, solitude:7, night:8, style:'powerful emotional' },
  '黄丽玲':     { moods:['需要安慰','想你了','有点苦恼'], intensity:8, warmth:6, solitude:8, night:9, style:'soulful heartbreak' },
  '孙燕姿':     { moods:['今天很幸福','想你了','想一个人发呆'], intensity:6, warmth:7, solitude:7, night:8, style:'clear emotional' },
  '张惠妹':     { moods:['需要安慰','想你了'], intensity:8, warmth:6, solitude:7, night:8, style:'power ballad' },
  '莫文蔚':     { moods:['有点苦恼','想一个人发呆','想你了'], intensity:6, warmth:6, solitude:8, night:8, style:'sensual melancholy' },
  '梁静茹':     { moods:['今天很幸福','想被抱抱','需要安慰'], intensity:6, warmth:8, solitude:7, night:7, style:'warm comfort' },
  '杨丞琳':     { moods:['开心开心','今天很幸福','想你了'], intensity:5, warmth:7, solitude:6, night:6, style:'sweet pop' },
  '郭静':       { moods:['今天很幸福','需要安慰'], intensity:5, warmth:8, solitude:6, night:7, style:'pure ballad' },
  '郁可唯':     { moods:['想你了','想一个人发呆'], intensity:6, warmth:7, solitude:8, night:8, style:'ethereal ballad' },
  '梁咏琪':     { moods:['需要安慰','今天很幸福'], intensity:5, warmth:7, solitude:7, night:7, style:'clear ballad' },
  '许美静':     { moods:['想你了','想一个人发呆','今天有点累'], intensity:6, warmth:5, solitude:9, night:10, style:'late-night melancholy' },
  '王菲':       { moods:['想一个人发呆','想你了'], intensity:5, warmth:4, solitude:9, night:9, style:'ethereal cool' },
  '刘若英':     { moods:['想你了','今天很幸福'], intensity:5, warmth:7, solitude:7, night:8, style:'narrative ballad' },
  '那英':       { moods:['想你了','需要安慰'], intensity:7, warmth:6, solitude:7, night:8, style:'powerful ballad' },
  '张碧晨':     { moods:['有点苦恼','想你了','需要安慰'], intensity:7, warmth:6, solitude:8, night:8, style:'dramatic ballad' },
  '张韶涵':     { moods:['需要安慰','今天很幸福'], intensity:7, warmth:7, solitude:6, night:7, style:'inspirational pop' },
  '王心凌':     { moods:['开心开心','想被抱抱'], intensity:4, warmth:8, solitude:5, night:5, style:'sweet pop' },
  '蔡依林':     { moods:['开心开心'], intensity:7, warmth:5, solitude:5, night:6, style:'dance pop' },
  '萧亚轩':     { moods:['有点苦恼','想你了'], intensity:6, warmth:5, solitude:7, night:7, style:'urban ballad' },
  '徐佳莹':     { moods:['想你了','想一个人发呆'], intensity:6, warmth:7, solitude:8, night:8, style:'delicate ballad' },
  '戴佩妮':     { moods:['有点苦恼','想你了'], intensity:6, warmth:6, solitude:7, night:8, style:'literary ballad' },
  '孙盛希':     { moods:['想你了','有点苦恼'], intensity:6, warmth:6, solitude:7, night:8, style:'R&B ballad' },

  // ── Chinese: Poetic / Folk / Literary ──────────────────────────────────
  '许嵩':       { moods:['想一个人发呆','今天很幸福','想你了'], intensity:5, warmth:6, solitude:8, night:9, style:'literary poetic' },
  '陈粒':       { moods:['想一个人发呆','有点苦恼'], intensity:7, warmth:4, solitude:9, night:9, style:'indie art-pop' },
  '毛不易':     { moods:['想一个人发呆','今天有点累','需要安慰'], intensity:5, warmth:7, solitude:9, night:9, style:'weary folk' },
  '李健':       { moods:['想一个人发呆','今天很幸福'], intensity:5, warmth:7, solitude:8, night:9, style:'poetic folk' },
  '赵雷':       { moods:['想一个人发呆','想你了'], intensity:5, warmth:6, solitude:8, night:8, style:'folk narrative' },
  '朴树':       { moods:['想一个人发呆','今天有点累'], intensity:6, warmth:5, solitude:8, night:8, style:'melancholic folk' },
  '宋冬野':     { moods:['想一个人发呆','需要安慰'], intensity:6, warmth:5, solitude:9, night:9, style:'deep folk' },

  // ── Chinese: Powerful / Dramatic ──────────────────────────────────────
  '周深':       { moods:['想一个人发呆','今天很幸福'], intensity:7, warmth:7, solitude:8, night:8, style:'ethereal vocal' },
  '萨顶顶':     { moods:['想一个人发呆','洗澡放松一下'], intensity:8, warmth:5, solitude:8, night:8, style:'ethereal world' },
  '韩红':       { moods:['今天很幸福','想被抱抱'], intensity:7, warmth:8, solitude:6, night:7, style:'powerful warm' },
  '张杰':       { moods:['今天很幸福','想你了','想被抱抱'], intensity:8, warmth:7, solitude:6, night:7, style:'soaring romantic' },
  '华晨宇':     { moods:['有点苦恼','想一个人发呆'], intensity:9, warmth:3, solitude:8, night:8, style:'avant-garde' },
  '邓丽君':     { moods:['今天很幸福','想你了'], intensity:5, warmth:10, solitude:7, night:8, style:'timeless warm' },
  '蔡琴':       { moods:['想一个人发呆','今天很幸福'], intensity:5, warmth:9, solitude:8, night:9, style:'classic warm' },
  '费玉清':     { moods:['想一个人发呆','想你了'], intensity:5, warmth:8, solitude:7, night:8, style:'classic ballad' },
  '陈淑桦':     { moods:['想你了','今天很幸福'], intensity:6, warmth:7, solitude:7, night:8, style:'classic ballad' },
  '孟庭苇':     { moods:['今天很幸福','想你了'], intensity:5, warmth:8, solitude:7, night:8, style:'soft classic' },
  '赵咏华':     { moods:['今天很幸福','想被抱抱'], intensity:5, warmth:9, solitude:7, night:7, style:'warm romantic' },

  // ── Chinese: Contemporary / R&B / Indie ───────────────────────────────
  '单依纯':     { moods:['想你了','想一个人发呆','需要安慰'], intensity:6, warmth:7, solitude:8, night:8, style:'soulful ballad' },
  '颜人中':     { moods:['想你了','今天很幸福','想被抱抱'], intensity:6, warmth:7, solitude:7, night:8, style:'warm R&B' },
  '杜宣达':     { moods:['想你了','想一个人发呆'], intensity:5, warmth:7, solitude:8, night:9, style:'bedroom R&B' },
  '刘至佳':     { moods:['开心开心','想一个人发呆'], intensity:6, warmth:6, solitude:7, night:7, style:'alt R&B' },
  '徐秉龙':     { moods:['想一个人发呆','今天有点累','想你了'], intensity:5, warmth:7, solitude:9, night:9, style:'bedroom folk' },
  '太一':       { moods:['想一个人发呆','有点苦恼'], intensity:7, warmth:4, solitude:9, night:9, style:'experimental' },
  '鬼卞':       { moods:['有点苦恼','想一个人发呆'], intensity:8, warmth:3, solitude:9, night:9, style:'dark hip-hop' },
  'Jony J':     { moods:['有点苦恼','想一个人发呆'], intensity:6, warmth:4, solitude:8, night:8, style:'conscious rap' },
  '刘思鉴':     { moods:['想一个人发呆','有点苦恼'], intensity:5, warmth:5, solitude:9, night:9, style:'atmospheric' },
  '满舒克':     { moods:['想一个人发呆','有点苦恼'], intensity:5, warmth:6, solitude:8, night:9, style:'melodic rap' },
  '太一':       { moods:['想一个人发呆','有点苦恼'], intensity:7, warmth:4, solitude:9, night:9, style:'experimental' },
  '王贰浪':     { moods:['想被抱抱','想你了'], intensity:6, warmth:7, solitude:7, night:8, style:'tender ballad' },
  '隔壁老樊':   { moods:['需要安慰','想被抱抱','想你了'], intensity:7, warmth:6, solitude:8, night:8, style:'husky ballad' },
  '枯木逢春':   { moods:['今天很幸福','想你了'], intensity:5, warmth:7, solitude:7, night:8, style:'folk ballad' },
  '柏松':       { moods:['今天很幸福','想被抱抱'], intensity:5, warmth:8, solitude:7, night:7, style:'warm folk' },
  '于文文':     { moods:['想你了','有点苦恼'], intensity:6, warmth:5, solitude:7, night:8, style:'rock ballad' },
  '胡彦斌':     { moods:['想你了','有点苦恼'], intensity:7, warmth:5, solitude:7, night:8, style:'R&B ballad' },

  // ── Chinese: Folk / National Style ────────────────────────────────────
  '凤凰传奇':   { moods:['开心开心'], intensity:7, warmth:7, solitude:4, night:5, style:'folk-pop energetic' },
  '刀郎':       { moods:['想一个人发呆','想你了'], intensity:7, warmth:6, solitude:8, night:8, style:'desert folk' },
  '郑智化':     { moods:['有点苦恼','想一个人发呆'], intensity:7, warmth:5, solitude:8, night:8, style:'folk rock' },
  '伍佰':       { moods:['想一个人发呆','有点苦恼'], intensity:7, warmth:5, solitude:7, night:8, style:'rock ballad' },
  '许巍':       { moods:['想一个人发呆','今天有点累'], intensity:6, warmth:6, solitude:8, night:8, style:'folk rock' },

  // ── Chinese: Duets / Collaborations ───────────────────────────────────
  '薛之谦,韩红':     { moods:['想你了','想被抱抱'], intensity:7, warmth:7, solitude:7, night:8, style:'duet ballad' },
  '林俊杰,蔡卓妍':   { moods:['开心开心','今天很幸福'], intensity:6, warmth:8, solitude:5, night:6, style:'sweet duet' },
  '韩红,孙楠':       { moods:['今天很幸福'], intensity:7, warmth:8, solitude:6, night:7, style:'power duet' },
  '周传雄,陆虎':     { moods:['想一个人发呆','今天有点累'], intensity:6, warmth:6, solitude:8, night:9, style:'melancholic duet' },
  '杨宗纬,宝石Gem,王宇宙Leto': { moods:['想一个人发呆','想你了'], intensity:6, warmth:6, solitude:8, night:9, style:'atmospheric collab' },
  '王赫野,姚晓棠':   { moods:['想一个人发呆','想你了'], intensity:6, warmth:7, solitude:8, night:9, style:'duet ballad' },
  'GAI周延,戴佩妮':  { moods:['想一个人发呆','想你了'], intensity:7, warmth:5, solitude:8, night:9, style:'rap ballad' },

  // ── English: Emotional Ballads ────────────────────────────────────────
  'Adele':          { moods:['需要安慰','想你了','有点苦恼'], intensity:8, warmth:7, solitude:8, night:9, style:'soulful ballad' },
  'Ed Sheeran':     { moods:['今天很幸福','想被抱抱'], intensity:6, warmth:9, solitude:6, night:7, style:'warm acoustic' },
  'Sam Smith':      { moods:['需要安慰','想你了'], intensity:7, warmth:7, solitude:8, night:9, style:'soulful ballad' },
  'Lewis Capaldi':  { moods:['需要安慰','想你了'], intensity:7, warmth:7, solitude:8, night:9, style:'heartfelt ballad' },
  'James Arthur':   { moods:['想你了','需要安慰'], intensity:7, warmth:6, solitude:8, night:8, style:'emotional ballad' },
  'Coldplay':       { moods:['想一个人发呆','今天很幸福'], intensity:7, warmth:6, solitude:7, night:8, style:'atmospheric rock' },
  'John Legend':    { moods:['今天很幸福','想被抱抱'], intensity:6, warmth:9, solitude:6, night:7, style:'romantic soul' },
  'Bruno Mars':     { moods:['开心开心','想被抱抱'], intensity:7, warmth:8, solitude:5, night:7, style:'funky romantic' },

  // ── English: Pop / R&B ────────────────────────────────────────────────
  'Justin Bieber':  { moods:['想被抱抱','开心开心','今天很幸福'], intensity:6, warmth:8, solitude:6, night:7, style:'romantic R&B' },
  'Ariana Grande':  { moods:['开心开心','洗澡放松一下'], intensity:6, warmth:7, solitude:5, night:6, style:'sweet pop' },
  'The Weeknd':     { moods:['想一个人发呆','有点苦恼'], intensity:7, warmth:4, solitude:8, night:9, style:'dark R&B' },
  'Taylor Swift':   { moods:['想你了','开心开心'], intensity:6, warmth:7, solitude:7, night:7, style:'narrative pop' },
  'Rihanna':        { moods:['有点苦恼','想一个人发呆'], intensity:6, warmth:5, solitude:7, night:8, style:'edgy R&B' },
  'Beyoncé':        { moods:['开心开心'], intensity:8, warmth:6, solitude:5, night:6, style:'power pop' },
  'Kendrick Lamar': { moods:['有点苦恼'], intensity:8, warmth:3, solitude:7, night:8, style:'conscious rap' },
  'SZA':            { moods:['想一个人发呆','有点苦恼'], intensity:6, warmth:5, solitude:8, night:9, style:'alt R&B' },
  'Frank Ocean':    { moods:['想一个人发呆','想你了'], intensity:5, warmth:5, solitude:9, night:9, style:'atmospheric R&B' },
  'Daniel Caesar':  { moods:['想被抱抱','想一个人发呆'], intensity:5, warmth:8, solitude:8, night:9, style:'warm R&B' },
  'H.E.R.':         { moods:['想你了','想一个人发呆'], intensity:5, warmth:7, solitude:8, night:9, style:'soulful R&B' },
  'Giveon':         { moods:['想你了','想被抱抱'], intensity:6, warmth:7, solitude:8, night:9, style:'deep R&B' },
  'Khalid':         { moods:['想一个人发呆','洗澡放松一下'], intensity:5, warmth:7, solitude:7, night:8, style:'chill R&B' },

  // ── English: Indie / Alternative ──────────────────────────────────────
  'Lana Del Rey':      { moods:['想一个人发呆','想你了'], intensity:6, warmth:5, solitude:9, night:9, style:'cinematic pop' },
  'Sufjan Stevens':    { moods:['想一个人发呆','今天有点累'], intensity:5, warmth:6, solitude:10, night:9, style:'indie folk' },
  'Bon Iver':          { moods:['想一个人发呆','今天有点累'], intensity:5, warmth:5, solitude:10, night:10, style:'winter folk' },
  'Phoebe Bridgers':   { moods:['想一个人发呆','需要安慰'], intensity:6, warmth:5, solitude:9, night:10, style:'indie folk' },
  'Troye Sivan':       { moods:['想你了','想被抱抱'], intensity:5, warmth:7, solitude:7, night:8, style:'dream pop' },
  'Lorde':             { moods:['想一个人发呆','有点苦恼'], intensity:6, warmth:4, solitude:8, night:9, style:'art pop' },
  'Billie Eilish':     { moods:['想一个人发呆','有点苦恼'], intensity:5, warmth:4, solitude:9, night:9, style:'whisper pop' },
  'Clairo':            { moods:['想一个人发呆','洗澡放松一下'], intensity:4, warmth:7, solitude:8, night:8, style:'bedroom pop' },
  'mxmtoon':           { moods:['洗澡放松一下','想一个人发呆'], intensity:4, warmth:8, solitude:7, night:7, style:'ukulele pop' },
  'beabadoobee':       { moods:['想被抱抱','洗澡放松一下'], intensity:5, warmth:8, solitude:7, night:7, style:'indie pop' },

  // ── English: Electronic / Ambient ─────────────────────────────────────
  'Alan Walker':       { moods:['想一个人发呆','今天有点累'], intensity:7, warmth:4, solitude:8, night:8, style:'electronic' },
  'Marshmello':        { moods:['开心开心'], intensity:6, warmth:5, solitude:5, night:6, style:'EDM pop' },
  'The Chainsmokers':  { moods:['开心开心','想一个人发呆'], intensity:6, warmth:5, solitude:6, night:7, style:'EDM pop' },
  'Owl City':          { moods:['今天很幸福','洗澡放松一下'], intensity:5, warmth:8, solitude:6, night:7, style:'synth pop' },
  'Zedd':              { moods:['开心开心'], intensity:7, warmth:5, solitude:5, night:6, style:'EDM' },
  'Calvin Harris':     { moods:['开心开心'], intensity:7, warmth:6, solitude:4, night:6, style:'EDM' },
  'Kygo':              { moods:['洗澡放松一下','今天很幸福'], intensity:5, warmth:7, solitude:6, night:7, style:'tropical house' },

  // ── English: Acoustic / Singer-Songwriter ─────────────────────────────
  'Anson Seabra':      { moods:['想一个人发呆','今天有点累','需要安慰'], intensity:5, warmth:7, solitude:9, night:9, style:'bedroom piano' },
  'Jeremy Zucker':     { moods:['想一个人发呆','今天有点累'], intensity:5, warmth:7, solitude:8, night:9, style:'bedroom pop' },
  'Lauv':              { moods:['想被抱抱','想你了'], intensity:5, warmth:7, solitude:7, night:8, style:'tender pop' },
  'Alexander 23':      { moods:['想被抱抱','想一个人发呆'], intensity:5, warmth:7, solitude:7, night:8, style:'bedroom pop' },
  'Conan Gray':        { moods:['有点苦恼','想一个人发呆'], intensity:5, warmth:6, solitude:8, night:8, style:'bedroom pop' },
  'Tate McRae':        { moods:['有点苦恼','想一个人发呆'], intensity:5, warmth:5, solitude:8, night:8, style:'dark pop' },
  'Gracie Abrams':     { moods:['想一个人发呆','想你了'], intensity:5, warmth:6, solitude:9, night:9, style:'bedroom folk' },
  'Lizzy McAlpine':    { moods:['想一个人发呆','想你了'], intensity:5, warmth:6, solitude:9, night:9, style:'folk pop' },
  'Tamas Wells':       { moods:['洗澡放松一下','想一个人发呆'], intensity:3, warmth:8, solitude:8, night:7, style:'gentle folk' },
  'Bruno Major':       { moods:['想被抱抱','今天很幸福'], intensity:4, warmth:9, solitude:7, night:8, style:'warm jazz' },

  // ── English: R&B / Soul Covers & Special ──────────────────────────────
  'Boyce Avenue':      { moods:['想你了','需要安慰'], intensity:5, warmth:8, solitude:7, night:8, style:'acoustic cover' },
  'MADILYN':           { moods:['想你了','需要安慰'], intensity:5, warmth:7, solitude:7, night:8, style:'acoustic cover' },
  'Anthem Lights':     { moods:['今天很幸福','想被抱抱'], intensity:5, warmth:8, solitude:6, night:7, style:'acoustic cover' },
  'Kina':              { moods:['想一个人发呆','今天有点累'], intensity:4, warmth:5, solitude:9, night:9, style:'lo-fi' },
  '88rising':          { moods:['洗澡放松一下','想你了'], intensity:5, warmth:6, solitude:7, night:8, style:'Asian R&B' },
  'NIKI':              { moods:['想你了','想一个人发呆'], intensity:5, warmth:6, solitude:8, night:9, style:'R&B ballad' },
  'Joji':              { moods:['想一个人发呆','今天有点累'], intensity:5, warmth:4, solitude:9, night:10, style:'lo-fi R&B' },
  'Rich Brian':        { moods:['想一个人发呆'], intensity:5, warmth:5, solitude:8, night:8, style:'alt rap' },

  // ── Chinese: New generation / R&B covers ──────────────────────────────
  '微醺卡带':     { moods:['洗澡放松一下','想一个人发呆'], intensity:4, warmth:7, solitude:8, night:9, style:'lo-fi R&B cover' },
  '浪漫的大呲花': { moods:['洗澡放松一下','想一个人发呆'], intensity:4, warmth:7, solitude:8, night:9, style:'lo-fi R&B cover' },
  '音乐风格电台': { moods:['洗澡放松一下','想一个人发呆'], intensity:4, warmth:7, solitude:8, night:9, style:'lo-fi R&B cover' },
  '红碎片':       { moods:['洗澡放松一下','想一个人发呆'], intensity:5, warmth:6, solitude:8, night:9, style:'R&B cover' },
  '炫动小霸王':   { moods:['洗澡放松一下','想一个人发呆'], intensity:5, warmth:6, solitude:8, night:9, style:'R&B cover' },
  '梦境里的算法': { moods:['想一个人发呆','洗澡放松一下'], intensity:4, warmth:6, solitude:9, night:9, style:'ambient' },
  '揽小':         { moods:['洗澡放松一下','今天很幸福'], intensity:4, warmth:7, solitude:7, night:8, style:'lo-fi' },
  '小黑':         { moods:['想一个人发呆'], intensity:5, warmth:6, solitude:8, night:8, style:'acoustic cover' },

  // ── Chinese: Classic / Old School ─────────────────────────────────────
  '韩宝仪':       { moods:['开心开心','今天很幸福'], intensity:5, warmth:7, solitude:5, night:6, style:'classic pop' },
  '龙梅子':       { moods:['开心开心','今天很幸福'], intensity:5, warmth:7, solitude:6, night:6, style:'classic pop' },
  '庞龙':         { moods:['开心开心','想你了'], intensity:6, warmth:7, solitude:6, night:7, style:'folk pop' },
  '阿牛':         { moods:['开心开心'], intensity:5, warmth:8, solitude:5, night:5, style:'happy folk' },
  '陈慧琳':       { moods:['想你了','今天很幸福'], intensity:6, warmth:7, solitude:7, night:8, style:'classic ballad' },
  '办桌二人组':   { moods:['想你了','需要安慰'], intensity:6, warmth:6, solitude:7, night:8, style:'classic ballad' },
  '娃娃':         { moods:['想你了','今天有点累'], intensity:6, warmth:7, solitude:8, night:9, style:'classic ballad' },
  '胡杨林':       { moods:['想你了','需要安慰'], intensity:6, warmth:6, solitude:7, night:8, style:'classic ballad' },
  '陈瑞':         { moods:['想你了','想一个人发呆'], intensity:6, warmth:5, solitude:8, night:9, style:'classic ballad' },
  '袁成杰':       { moods:['想你了','今天很幸福'], intensity:5, warmth:7, solitude:7, night:7, style:'classic pop' },
  '孙子涵':       { moods:['想你了','想一个人发呆'], intensity:5, warmth:6, solitude:8, night:8, style:'classic ballad' },
  '印子月':       { moods:['想你了','需要安慰'], intensity:5, warmth:6, solitude:7, night:8, style:'classic ballad' },
  '田一龙':       { moods:['想你了','今天很幸福'], intensity:6, warmth:7, solitude:7, night:8, style:'classic ballad' },

  // ── Chinese: Web / Indie Artists ──────────────────────────────────────
  '加木':         { moods:['想一个人发呆','有点苦恼'], intensity:5, warmth:5, solitude:8, night:9, style:'indie' },
  '余翊':         { moods:['洗澡放松一下','想一个人发呆'], intensity:4, warmth:7, solitude:8, night:9, style:'R&B cover' },
  '小匆匆':       { moods:['想一个人发呆','想你了'], intensity:5, warmth:6, solitude:8, night:9, style:'acoustic cover' },
  '缘为冰':       { moods:['想一个人发呆','想你了'], intensity:5, warmth:5, solitude:9, night:9, style:'atmospheric' },
  '尹昔眠':       { moods:['想一个人发呆','洗澡放松一下'], intensity:5, warmth:6, solitude:8, night:9, style:'folk ballad' },
  '戴羽彤':       { moods:['想一个人发呆','想你了'], intensity:5, warmth:7, solitude:8, night:8, style:'acoustic cover' },
  '王赫野':       { moods:['想一个人发呆'], intensity:5, warmth:6, solitude:7, night:8, style:'pop' },
  '男才女貌':     { moods:['想你了','今天很幸福'], intensity:5, warmth:7, solitude:7, night:7, style:'classic pop' },
  '陈文杰的音悦': { moods:['洗澡放松一下','想一个人发呆'], intensity:4, warmth:7, solitude:8, night:9, style:'R&B cover' },
  '群星':         { moods:['今天很幸福','想你了'], intensity:5, warmth:7, solitude:6, night:7, style:'classic' },
  'By2':          { moods:['开心开心','想被抱抱'], intensity:5, warmth:7, solitude:6, night:6, style:'sweet pop' },
  'Sweety':       { moods:['今天很幸福','开心开心'], intensity:4, warmth:8, solitude:6, night:6, style:'sweet pop' },
  'Xun':          { moods:['想你了'], intensity:5, warmth:6, solitude:7, night:8, style:'pop ballad' },
  'FORMOSA':      { moods:['想一个人发呆','洗澡放松一下'], intensity:5, warmth:6, solitude:8, night:8, style:'atmospheric' },
  'HuiuioOo,Crybird': { moods:['开心开心','洗澡放松一下'], intensity:4, warmth:7, solitude:7, night:7, style:'lo-fi' },
  'moonlight':    { moods:['想一个人发呆','今天有点累'], intensity:5, warmth:5, solitude:9, night:10, style:'R&B cover' },
  'Capt. Lilia Iwasko': { moods:['洗澡放松一下','想一个人发呆'], intensity:4, warmth:7, solitude:8, night:9, style:'R&B cover' },
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 2 — Title/Subject Keyword Expansion
// ═══════════════════════════════════════════════════════════════════════════

const MOOD_KEYWORDS = {

  '想你了': {
    relationship: [
      '想你','想他','想她','思念','想念','牵挂','惦记','见不到','异地','距离',
      '远方','天涯','海角','分隔','离开','不在','缺席','等你','候你','望你',
      '没有你','少了你','缺了你','你不在','你走了','你离开','不见','再也不见',
      '不再联系','分手','分开','告别','走了','散了','离别','离你','两地',
    ],
    atmosphere: [
      '深夜','凌晨','黄昏','傍晚','雨天','雨季','下雪','冬天','窗外',
      '月光','路灯','街灯','空房间','冷风','夜色','暗','静',
    ],
    emotional: [
      '遗憾','错过','不甘','可惜','如果','也许','曾经','过往',
      '回不去','忘不掉','放不下','删了','舍不得','最难','好久不见',
      '又如何','怎么办','你在哪','还好吗','还好不好','好不好',
    ],
    time: [
      '那年','那天','那夜','那时','从前','曾经','后来','之后',
      '多年以后','好久不见','一千年','好久',
    ],
  },

  '开心开心': {
    energy: [
      '开心','快乐','高兴','笑了','哈哈','好棒','太好了','太棒','爽',
      '跳舞','跳舞','狂欢','派对','party','PARTY','庆祝','嗨','燥',
      '起风了','出发','向前','奔跑','大声','笑着',
    ],
    scene: [
      '阳光','晴天','夏天','海边','沙滩','开花','花开','春天',
      '彩虹','放晴','晴朗','闪耀','闪亮','发光','亮','笑',
    ],
    mood: [
      '心情好','心情不错','今天好','好心情','超好','好好',
      '完美','太对','对了','对味','正好','刚刚好',
    ],
    action: [
      '跟着','摇摆','舞动','跳起来','起飞','飞起','放',
      '喊出来','唱出来','嗨起来','野','疯','燃',
    ],
  },

  '今天很幸福': {
    relationship: [
      '幸福','满足','甜','甜蜜','被爱','被爱着','珍惜','感恩','感谢',
      '拥有','有你在','因为有你','你来了','遇见','相遇','认识',
      '在一起','相爱','恋爱','爱情','爱','情','喜欢',
      '陪伴','陪着你','在你身边','抱','牵手','吻','亲',
      '嫁','娶','婚','一生','一世','永远','一直','一起',
    ],
    atmosphere: [
      '暖','温暖','温柔','柔','软','轻轻','微风','花香',
      '月光','星光','星空','灯火','烛光','日出','晨光',
      '花','春天','晴','好天气','蓝天','白云',
    ],
    emotional: [
      '幸运','美好','圆满','珍贵','完美','刚刚好','真好',
      '值得','感恩','满足','够了','就好','这样就好',
      '浪漫','心动','悸动','脸红','心跳',
    ],
  },

  '需要安慰': {
    emotional: [
      '难过','伤心','难受','心疼','痛苦','心碎','崩溃','撑不住',
      '哭了','流泪','眼泪','泪','泣','哽咽','无声',
      '委屈','不被理解','没人懂','没人知道','说不出口',
      '失望','绝望','心寒','心冷','心酸','心痛','心碎',
      '一个人','独自','孤单','孤独','寂寞','无依','无靠',
      '失败','输了','不行','不能','没办法','无奈',
    ],
    healing: [
      '没关系','会好的','没事','会过去','会好','慢慢来',
      '加油','撑下去','坚持','挺住','别放弃','别怕',
      '原谅','放过','释怀','放下','放手','看开',
    ],
    scene: [
      '深夜','下雨','阴天','冷','冬天','一个人在家',
      '关灯','黑暗','黑','暗','角落','蜷','缩',
    ],
  },

  '想被抱抱': {
    physical: [
      '抱抱','抱紧','拥抱','搂','靠','贴近','贴','挨','依偎',
      '怀里','胸前','肩膀','臂弯','身旁','旁边',
      '抱着','搂着','牵着手','手牵手','十指',
    ],
    emotional: [
      '被爱','被需要','被保护','安全感','安心','暖',
      '温柔','轻轻','软软','暖暖','温暖','温度',
      '需要你','想要你','别走','留下来','不要走',
      '我怕','别离开','陪我','陪我一会儿',
    ],
    intimate: [
      '耳边','耳边轻语','悄悄话','低声','轻语','气息',
      '近距离','靠近一点','再近一点','贴近','贴紧',
      '心跳','呼吸','你的温度','你的味道',
    ],
  },

  '有点苦恼': {
    emotional: [
      '烦恼','苦恼','纠结','矛盾','挣扎','两难','为难',
      '压力','焦虑','紧张','不安','忐忑','心慌','烦躁',
      '不知道','不确定','不明白','搞不懂','怎么','为什么',
      '复杂','混乱','乱','理不清','想不通','想太多',
      '厌倦','烦了','够了','受够了','不想了',
    ],
    conflict: [
      '爱我还是他','左右为难','进也不是退也不是','进退',
      '该怎么办','怎么选','选哪个','选谁','谁对谁错',
      '怀疑','质疑','不信','欺骗','谎言','真相',
      '背叛','出轨','第三者','三角','暧昧','纠缠',
    ],
    identity: [
      '我是谁','算什么','凭什么','为什么是我',
      '不一样','不同','特别','怪','不正常','不合群',
      '假装','伪装','面具','演戏','演','扮演',
    ],
  },

  '洗澡放松一下': {
    physical: [
      '洗澡','泡澡','热水','水','冲','洗','浴','沐浴',
      '放松','卸下','放下','释放','松懈','松散',
      '舒服','舒适','惬意','懒','瘫','躺','卧',
    ],
    atmosphere: [
      '飘','浮','流','荡','轻盈','轻','柔','软',
      '水','海','湖','河','波','浪','涟漪','荡漾',
      '风','云','雾','气','烟','朦胧','迷离',
      '光','影','斑驳','摇曳','闪烁','忽明忽暗',
      '墨染','墨','染','青','蓝','绿','翠',
      '琴','弦','笛','箫','琵琶','古筝',
      '逍遥','自在','自由','无拘','无束',
    ],
    emotional: [
      '什么都不想','放空','空白','安静','宁静','静',
      '独处','独享','属于我','我的时间','私人',
      '慢','缓','徐徐','悠悠','慢慢','轻缓',
    ],
  },

  '想一个人发呆': {
    emotional: [
      '发呆','放空','空白','空洞','出神','走神','恍神',
      '不想说话','不想动','懒得','累了','倦了',
      '安静','静','沉默','无声','无言','说不出话',
      '一个人','独处','独自','单独','单人',
      '空','空心','空虚','空旷','空洞洞',
      '漂','漂浮','漂流','游荡','徘徊','漫步',
    ],
    atmosphere: [
      '深夜','凌晨','半夜','天刚亮','日出前','天亮前',
      '月光','路灯','窗外','阳台','屋顶','天台',
      '雨','雨天','下雨','细雨','暴雨','雨后',
      '雪','下雪','雪天','冬季','冷天','寒',
      '黄昏','夕阳','落日','傍晚','天色渐暗',
      '雾','雾霾','灰','灰色','黑白',
      '水','深水','湖','潭','井','渊',
      '影子','阴影','暗处','角落','边缘','边际',
    ],
    scene: [
      '烟','抽烟','点烟','烟雾','烟圈','吐烟',
      '窗边','窗台','靠着窗','望窗外','看窗外',
      '路','马路','街道','巷','小道','公路',
      '夜车','末班车','地铁','公交','车站',
      '耳机','听歌','单曲循环','循环','播放',
    ],
  },

  '今天有点累': {
    physical: [
      '累','疲惫','疲倦','困','乏','无力','没力气',
      '撑不住','撑不下去','不行了','到极限','透支',
      '好累','太累','累死了','好困','真的累',
      '休息','睡','眠','躺','歇','停',
    ],
    emotional: [
      '今天够了','已经够了','就这样吧','不想了','算了',
      '放弃了','不管了','随便','无所谓','没关系',
      '今天很努力','努力了','尽力了','做了很多',
    ],
    atmosphere: [
      '夜深','深夜','凌晨','晚上','天黑',
      '安静','轻轻的','慢慢','缓缓','软',
      '床','枕头','被窝','沙发','椅子','灯',
    ],
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 3 — Score Computation
// ═══════════════════════════════════════════════════════════════════════════

function computeScores(artistProfile, moodTags, energyLevel, full, zh) {
  let intensity, warmth, solitude, night

  if (artistProfile) {
    intensity = artistProfile.intensity
    warmth    = artistProfile.warmth
    solitude  = artistProfile.solitude
    night     = artistProfile.night
  } else {
    // Sensible defaults for unknown artists
    intensity = 5
    warmth    = 5
    solitude  = 7
    night     = 7
  }

  // Adjust by energy level
  if (energyLevel === '高') { intensity = Math.min(10, intensity + 1); solitude = Math.max(1, solitude - 1) }
  if (energyLevel === '低') { intensity = Math.max(1, intensity - 1); solitude = Math.min(10, solitude + 1); night = Math.min(10, night + 1) }

  // Adjust by mood tags
  if (moodTags.includes('开心开心'))      { warmth = Math.min(10, warmth + 2); solitude = Math.max(1, solitude - 2); night = Math.max(1, night - 2) }
  if (moodTags.includes('今天很幸福'))    { warmth = Math.min(10, warmth + 2); solitude = Math.max(1, solitude - 1) }
  if (moodTags.includes('想被抱抱'))      { warmth = Math.min(10, warmth + 2) }
  if (moodTags.includes('想你了'))        { solitude = Math.min(10, solitude + 1); night = Math.min(10, night + 1) }
  if (moodTags.includes('想一个人发呆'))  { solitude = Math.min(10, solitude + 2); night = Math.min(10, night + 2) }
  if (moodTags.includes('今天有点累'))    { solitude = Math.min(10, solitude + 1); night = Math.min(10, night + 2); intensity = Math.max(1, intensity - 1) }
  if (moodTags.includes('需要安慰'))      { warmth = Math.max(1, warmth - 1); intensity = Math.min(10, intensity + 1) }
  if (moodTags.includes('有点苦恼'))      { warmth = Math.max(1, warmth - 1); night = Math.min(10, night + 1) }
  if (moodTags.includes('洗澡放松一下'))  { warmth = Math.min(10, warmth + 1); solitude = Math.min(10, solitude + 1) }

  // Title-based adjustments
  if (has(full, 'live', 'remix', 'remastered')) { intensity = Math.min(10, intensity + 1) }
  if (has(full, 'acoustic', 'piano', 'unplugged')) { warmth = Math.min(10, warmth + 1); intensity = Math.max(1, intensity - 1) }
  if (has(zh, 'R&B', 'r&b', 'rb')) { night = Math.min(10, night + 1) }

  // Clamp
  return {
    emotionalIntensity: Math.max(1, Math.min(10, intensity)),
    warmthLevel:        Math.max(1, Math.min(10, warmth)),
    solitudeLevel:      Math.max(1, Math.min(10, solitude)),
    nightListeningScore: Math.max(1, Math.min(10, night)),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO ARTIST PROFILE GENERATOR (for artists not in ARTIST_PROFILES)
// ═══════════════════════════════════════════════════════════════════════════

function inferArtistProfile(artist, title) {
  const a = artist.toLowerCase()
  const t = title.toLowerCase()
  const zh = artist + ' ' + title

  // R&B / Lo-fi / Chill covers
  if (has(zh, 'R&B', 'r&b', 'rb', '卡带', '微醺', '大呲花', '电台', '音悦')
      || has(a, 'chill', 'lofi', 'lo-fi', 'cover', 'remix')) {
    return { moods: ['洗澡放松一下', '想一个人发呆'], intensity: 4, warmth: 7, solitude: 8, night: 9, style: 'R&B cover' }
  }

  // Live / concert versions
  if (has(zh, 'Live', 'live版', 'Live版', '现场')) {
    return { moods: ['想一个人发呆', '想你了'], intensity: 7, warmth: 6, solitude: 7, night: 8, style: 'live' }
  }

  // English pop divas
  if (has(a, 'ariana', 'beyoncé', 'beyonce', 'rihanna', 'lady gaga', 'katy perry', 'dua lipa', 'selena'))
    return { moods: ['开心开心', '洗澡放松一下'], intensity: 7, warmth: 6, solitude: 5, night: 6, style: 'pop diva' }

  // English male pop/R&B
  if (has(a, 'justin', 'bieber', 'drake', 'weeknd', 'frank ocean', 'daniel caesar', 'giveon', 'khalid', 'chris brown', 'usher', 'miguel'))
    return { moods: ['想被抱抱', '想你了'], intensity: 6, warmth: 7, solitude: 7, night: 8, style: 'R&B romantic' }

  // English indie/folk
  if (has(a, 'bon iver', 'phoebe', 'sufjan', 'iron & wine', 'fleet foxes', 'novo amor', 'vancouver sleep clinic'))
    return { moods: ['想一个人发呆', '今天有点累'], intensity: 5, warmth: 5, solitude: 10, night: 10, style: 'indie folk' }

  // English singer-songwriter
  if (has(a, 'gracie', 'lizzy', 'tate mcrae', 'conan gray', 'alexander 23', 'ansone', 'jeremy zucker', 'lauv', 'chelsea cutler'))
    return { moods: ['想一个人发呆', '想你了'], intensity: 5, warmth: 7, solitude: 8, night: 9, style: 'bedroom pop' }

  // EDM / Electronic
  if (has(a, 'alan walker', 'marshmello', 'chainsmokers', 'zedd', 'kygo', 'calvin harris', 'illenium', 'odesza', 'flume'))
    return { moods: ['想一个人发呆', '洗澡放松一下'], intensity: 6, warmth: 5, solitude: 7, night: 8, style: 'electronic' }

  // Acoustic covers
  if (has(a, 'boyce avenue', 'madilyn', 'anthem lights', 'kurt hugo', 'walk off the earth', 'pentatonix'))
    return { moods: ['想你了', '需要安慰'], intensity: 5, warmth: 8, solitude: 7, night: 8, style: 'acoustic cover' }

  // Chinese artists — love ballad (情歌) indicators
  if (has(zh, '爱', '情', '恋', '想你', '思念', '分手', '别离', '等你', '忘记', '忘不了', '舍不得'))
    return { moods: ['想你了', '需要安慰'], intensity: 6, warmth: 6, solitude: 7, night: 8, style: 'love ballad' }

  // Chinese artists — warm/romantic
  if (has(zh, '幸福', '甜蜜', '在一起', '遇见', '陪伴', '陪着你', '永远', '婚', '嫁', '牵'))
    return { moods: ['今天很幸福', '想被抱抱'], intensity: 5, warmth: 8, solitude: 6, night: 7, style: 'warm romantic' }

  // Chinese artists — melancholy/sad
  if (has(zh, '伤', '泪', '哭', '痛', '悲', '暗', '冷', '寂寞', '孤独', '遗憾', '失去', '离开', '错过'))
    return { moods: ['需要安慰', '想你了', '想一个人发呆'], intensity: 7, warmth: 5, solitude: 8, night: 9, style: 'melancholy' }

  // Chinese artists — anicent/wuxia/poetic
  if (has(zh, '剑', '侠', '江湖', '天下', '江山', '烟沙', '千年', '前世', '墨', '青', '弦', '琴', '箫', '笛', '山水'))
    return { moods: ['想一个人发呆', '想你了'], intensity: 6, warmth: 5, solitude: 9, night: 9, style: 'poetic ballad' }

  // Chinese artists — classic oldies
  if (has(zh, '邓丽君', '蔡琴', '费玉清', '凤飞飞', '龙飘飘', '韩宝仪', '陈淑桦', '孟庭苇', '赵咏华', '娃娃'))
    return { moods: ['今天很幸福', '想你了'], intensity: 5, warmth: 9, solitude: 7, night: 8, style: 'classic warm' }

  // Default — still try to be smarter than just "想一个人发呆"
  return { moods: ['想一个人发呆', '想你了'], intensity: 5, warmth: 6, solitude: 8, night: 9, style: 'unknown ballad' }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTER-LEVEL CHINESE SENTIMENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════
// When keyword matching fails, detect mood from individual Chinese characters

const CHAR_SENTIMENT = {
  // Love / longing
  '爱': ['想你了', '今天很幸福'],
  '情': ['想你了'],
  '恋': ['想你了', '今天很幸福'],
  '思': ['想你了'],
  '念': ['想你了'],
  '想': ['想你了'],
  '你': ['想你了'],
  '他': ['想你了'],
  '她': ['想你了'],
  '等': ['想你了'],
  '候': ['想你了'],
  '牵': ['想被抱抱', '今天很幸福'],
  '吻': ['想被抱抱', '今天很幸福'],
  '抱': ['想被抱抱'],
  '拥': ['想被抱抱'],
  '暖': ['想被抱抱', '今天很幸福'],
  '甜': ['今天很幸福', '开心开心'],
  '幸': ['今天很幸福'],
  '福': ['今天很幸福'],
  '美': ['今天很幸福'],
  '好': ['今天很幸福', '开心开心'],
  '圆': ['今天很幸福'],
  '满': ['今天很幸福'],

  // Happiness
  '笑': ['开心开心'],
  '乐': ['开心开心', '今天很幸福'],
  '欢': ['开心开心'],
  '喜': ['开心开心', '今天很幸福'],
  '庆': ['开心开心'],
  '舞': ['开心开心'],
  '跳': ['开心开心'],
  '歌': ['开心开心'],
  '唱': ['开心开心'],
  '阳': ['开心开心', '今天很幸福'],
  '晴': ['开心开心', '今天很幸福'],
  '花': ['开心开心', '今天很幸福'],
  '春': ['今天很幸福', '洗澡放松一下'],
  '光': ['今天很幸福', '洗澡放松一下'],

  // Sadness / comfort needed
  '伤': ['需要安慰'],
  '泪': ['需要安慰'],
  '哭': ['需要安慰'],
  '痛': ['需要安慰'],
  '悲': ['需要安慰'],
  '暗': ['需要安慰', '想一个人发呆'],
  '黑': ['需要安慰', '想一个人发呆'],
  '冷': ['需要安慰', '想一个人发呆'],
  '寒': ['需要安慰', '想一个人发呆'],
  '孤': ['想一个人发呆', '需要安慰'],
  '独': ['想一个人发呆'],
  '寂': ['想一个人发呆', '今天有点累'],
  '寞': ['想一个人发呆', '今天有点累'],
  '空': ['想一个人发呆'],
  '静': ['想一个人发呆', '洗澡放松一下'],
  '默': ['想一个人发呆'],
  '憾': ['想你了', '需要安慰'],
  '错': ['有点苦恼', '想你了'],
  '失': ['需要安慰', '想你了'],
  '落': ['想一个人发呆', '今天有点累'],

  // Conflict / distress
  '烦': ['有点苦恼'],
  '恼': ['有点苦恼'],
  '愁': ['有点苦恼', '想一个人发呆'],
  '困': ['有点苦恼', '今天有点累'],
  '惑': ['有点苦恼'],
  '疑': ['有点苦恼'],
  '迷': ['有点苦恼', '想一个人发呆'],
  '乱': ['有点苦恼'],
  '慌': ['有点苦恼'],

  // Relaxation
  '漂': ['洗澡放松一下', '想一个人发呆'],
  '浮': ['洗澡放松一下', '想一个人发呆'],
  '流': ['洗澡放松一下', '想一个人发呆'],
  '风': ['洗澡放松一下', '想一个人发呆'],
  '云': ['洗澡放松一下', '想一个人发呆'],
  '水': ['洗澡放松一下', '想一个人发呆'],
  '海': ['洗澡放松一下', '想一个人发呆'],
  '湖': ['洗澡放松一下', '想一个人发呆'],
  '烟': ['想一个人发呆', '洗澡放松一下'],
  '雾': ['想一个人发呆'],
  '梦': ['想一个人发呆', '今天有点累'],
  '幻': ['想一个人发呆'],
  '虚': ['想一个人发呆'],
  '醉': ['洗澡放松一下', '想一个人发呆'],
  '悠': ['洗澡放松一下'],
  '逍': ['洗澡放松一下'],
  '遥': ['洗澡放松一下'],
  '慢': ['洗澡放松一下', '今天有点累'],
  '轻': ['洗澡放松一下'],
  '柔': ['洗澡放松一下', '想被抱抱'],
  '雪': ['想一个人发呆'],
  '雨': ['想一个人发呆', '需要安慰'],
  '夜': ['想一个人发呆', '今天有点累'],
  '晚': ['想一个人发呆'],
  '昏': ['想一个人发呆', '今天有点累'],
  '夕': ['想一个人发呆'],
  '月': ['想一个人发呆', '想你了'],
  '星': ['想一个人发呆', '今天很幸福'],

  // Fatigue
  '累': ['今天有点累'],
  '倦': ['今天有点累'],
  '疲': ['今天有点累'],
  '乏': ['今天有点累'],
  '歇': ['今天有点累'],
  '停': ['今天有点累'],
  '休': ['今天有点累'],
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════

function classify(filename) {
  const { artist, title } = parseName(filename)
  const full = (artist + ' ' + title).toLowerCase()
  const zh = artist + ' ' + title
  const artistProfile = ARTIST_PROFILES[artist] || inferArtistProfile(artist, title)

  const moodSet = new Set()

  // Layer 1: Artist profile moods (always include)
  if (artistProfile) {
    artistProfile.moods.forEach(m => moodSet.add(m))
  }

  // Layer 2: Keyword matching (additive — can add more moods beyond artist profile)
  for (const [mood, kw] of Object.entries(MOOD_KEYWORDS)) {
    for (const cat of Object.values(kw)) {
      if (hasAny(zh, cat) || hasAny(full, cat)) {
        moodSet.add(mood)
        break
      }
    }
  }

  // Layer 3: Character-level sentiment (for Chinese titles)
  // Only add moods that are well-supported by multiple character matches
  const charMoodCounts = {}
  for (const ch of zh) {
    const moods = CHAR_SENTIMENT[ch]
    if (moods) {
      moods.forEach(m => { charMoodCounts[m] = (charMoodCounts[m] || 0) + 1 })
    }
  }
  // Add any mood with 2+ character matches (strong signal)
  for (const [mood, count] of Object.entries(charMoodCounts)) {
    if (count >= 2) moodSet.add(mood)
  }

  // Ensure at least 1 mood
  if (moodSet.size === 0) {
    moodSet.add('想一个人发呆')
  }

  // ── Deduplicate & order by priority ───────────────────────────
  const moodPriority = [
    '今天很幸福', '开心开心', '想被抱抱', '想你了',
    '需要安慰', '有点苦恼', '洗澡放松一下', '想一个人发呆', '今天有点累',
  ]
  const uniqueTags = moodPriority.filter(m => moodSet.has(m))

  // ── Energy level ─────────────────────────────────────────────────
  let energyLevel = '中'

  const highEnergyKw = [
    'party','dance','bang','domino','cheap thrills','havana','shape of you',
    'attention','swagger','wasabi','boys','queen','bad romance','savage',
    'mood','pumped','rockstar','up ','young dumb','señorita','now or never',
    'river ','mercy','labour','nexus','supermassive','whip','groovy','feat',
    'remix','live','405','speed','yukon','witchya','eye candy','calculator',
    'tequila','hey kong','bad honey','yummy',
  ]
  const lowEnergyKw = [
    'acoustic','piano','slow','sleep','bamboo','valder','hush','easy on me',
    'leave out all','let me down','comethru','love is gone','met at a party',
    'mariage','how do i love thee','i remember','your bones','faded','fade',
    'free loop','throwaway','lowkey','bored','ocean of stars','50 feet',
    'la la lost','strange land','visions of gideon','mystery of love',
    'strawberries','walking away','need it','all i can take',
  ]
  const highEnergyZh = [
    '开心','再不疯狂','野子','party','PARTY','跳楼机','极恶都市',
    '好想爱这个世界','恶作剧','庆功酒','狂恋','危险派对','大花轿',
    '大声唱','模特','模特','舞女','爱要坦荡荡','日不落','快乐',
  ]
  const lowEnergyZh = [
    '呓语','山丘','水星记','凄美地','兰亭序','雪落下','那时雨',
    '借月','慢冷','消散对白','阿拉斯加海湾','想自由','孤身',
    '小半','秦淮景','琴','墨染','青玉恋','若梦','西楼别序',
    '发呆','失恋','遗憾','一个人','落空','若梦','下雨','雨天',
    '南屏晚钟','千里之外','一千年以后','千年','两难','怎样',
    '白狐','舞女泪','寂寞','安静','静','夜','晚安','月光',
    '半句再见','西海情歌','如果当时','山水之间','半城烟沙',
    '富士山下','红豆','因为爱情','胆小鬼','天使的翅膀',
  ]

  if (hasAny(full, highEnergyKw) || hasAny(zh, highEnergyZh)) {
    energyLevel = '高'
  } else if (hasAny(full, lowEnergyKw) || hasAny(zh, lowEnergyZh)) {
    energyLevel = '低'
  }

  // ── Scores — use resolved profile (explicit or inferred) ─────
  const scores = computeScores(artistProfile, uniqueTags, energyLevel, full, zh)

  // ── Emotional description ────────────────────────────────────────
  const primaryMood = uniqueTags[0] || '想一个人发呆'
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
  const emotionalDescription = emoDescMap[primaryMood] || '情绪流动感'

  // ── bestFor ──────────────────────────────────────────────────────
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
  const bestFor = bestForMap[primaryMood] || '适合静静独处、感受音乐的时候'

  // ── romanticReason ───────────────────────────────────────────────
  const romanticReason = getRomanticReason(artist, title, primaryMood, uniqueTags)

  return {
    title,
    artist,
    src: `/songs/${filename}`,
    moodTags: uniqueTags,
    energyLevel,
    emotionalDescription,
    bestFor,
    romanticReason,
    ...scores,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROMANTIC REASONS
// ═══════════════════════════════════════════════════════════════════════════

function getRomanticReason(artist, title, primaryMood, allMoods) {
  const key = `${artist} - ${title}`

  const customReasons = {
    // Top Chinese artists
    '薛之谦 - 演员': '每个人心里都有一个角色，只是不想再演了。',
    '薛之谦 - 暧昧': '暧昧是比喜欢更难说出口的东西。',
    '薛之谦 - 意外': '所有的爱都是意外，遇见你也是。',
    '薛之谦 - 绅士': '最温柔的，是懂得克制的那种爱。',
    '薛之谦 - 动物世界': '喜欢你这件事，比我想象的还要认真。',
    '薛之谦 - 刚刚好': '不早不晚，在最对的时候遇见你。',
    '薛之谦 - 你还要我怎样': '有些话说了不如不说，不说又太难熬。',
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
    '薛之谦 - 有没有': '有没有人，会不顾一切地爱你。',
    '薛之谦 - 我终于成了别人的女人': '那些遗憾，终究只剩一首歌来说。',
    '薛之谦 - 那是你离开了北京的生活': '离开之后才明白，某些人是城市的一部分。',
    '薛之谦 - 怪咖': '怪的人遇见怪的人，就是缘分。',
    '薛之谦 - 潮流季': '流行过了，真心却从未过时。',
    '薛之谦 - 像风一样': '像风一样把你围绕，让你感觉到我。',
    '薛之谦 - 哑巴': '有些话，只能用沉默来说。',
    '薛之谦 - 陪你去流浪': '你去哪里，我就去哪里，不需要理由。',
    '薛之谦 - 这么久没见': '这么久没见，你还是我想的样子。',
    '薛之谦 - 笑场': '在你面前笑了场，也不觉得丢脸。',

    '林俊杰 - 江南': '烟雨江南，最适合想一个人。',
    '林俊杰 - 她说': '有些话，只有音乐说得出口。',
    '林俊杰 - 茉莉雨': '雨里有你的影子，茉莉香里有你的名字。',
    '林俊杰 - 熟能生巧': '爱一个人久了，连呼吸都成了习惯。',
    '林俊杰 - 记得': '记得你的每一个细节，一直都记得。',
    '林俊杰 - 我还想她': '忘不掉，是因为太认真地喜欢过。',
    '林俊杰 - 一千年以后': '一千年以后，我还是会认出你。',
    '林俊杰 - 曹操': '爱一个人，也需要几分英雄气概。',
    '林俊杰,蔡卓妍 - 小酒窝': '你笑起来的样子，是这世界上最好看的。',

    '周深 - 雪落下的声音 (Live)': '雪落下来的声音，安静得像你的名字。',
    '周深 - 兰亭序': '故事写在水里，名字刻在心上。',
    '周深 - 怜悯 (Live)': '不需要你的怜悯，只需要你的心。',
    '周深 - Monsters (Live)': '每个人心里都有一只怪兽，被你温柔对待时才安静下来。',

    '陈粒 - 走马': '走马观花，唯独你让我停下来。',
    '陈粒 - 小半': '你不是全部，你是比全部还多的那一点。',
    '陈粒 - 易燃易爆炸': '遇见你之前，我不知道自己有多容易着火。',
    '陈粒 - 奇妙能力歌': '有你的世界，多了一种奇妙的颜色。',
    '陈粒 - 光': '你是所有黑暗里透进来的那道光。',
    '陈粒 - 虚拟': '现实里难以说出的话，都藏在这首歌里。',
    '陈粒 - 种种': '种种可能，我只想要有你的那一种。',

    '毛不易 - 呓语': '半梦半醒之间，说的都是你。',
    '毛不易 - 像我这样的人': '像我这样的人，也在认认真真地爱你。',
    '毛不易 - 无问': '不问从何而来，不问去往何处，只要你在。',
    '毛不易 - 小王日记': '生活里的小事，都想和你分享。',

    '孙燕姿 - 遇见': '遇见，是所有故事最好的开头。',
    '孙燕姿 - 开始懂了': '慢慢懂了，有些人是专门来让你心动的。',
    '孙燕姿 - 雨天': '下雨天，就想听这首歌。',
    '孙燕姿 - 半句再见 (From At Café 6  Main Theme Song)': '半句再见，藏着太多没说出口的话。',

    'G.E.M.邓紫棋 - 光年之外': '跨越光年，只是为了找到你。',
    'G.E.M.邓紫棋 - 句号': '有些故事，不想画上句号。',
    'G.E.M.邓紫棋 - 多远都要在一起': '不管多远，都要在一起。',
    'G.E.M.邓紫棋 - 泡沫': '有些感情，像泡沫一样美，也一样易碎。',
    'G.E.M.邓紫棋 - 倒数': '倒数着见你的日子，一天比一天期待。',
    'G.E.M.邓紫棋 - 来自天堂的魔鬼': '爱你是天堂，想你是魔鬼。',

    '梁静茹 - 勇气': '爱你，是我做过最勇敢的事。',
    '梁静茹 - 分手快乐': '爱过了，就够了。',

    '陈奕迅 - 孤独患者': '孤独的人，需要一首懂他的歌。',
    '陈奕迅 - 浮夸': '所有的热闹，都是一个人的孤独。',
    '陈奕迅 - 阴天快乐': '阴天也要快乐，因为你在。',
    '陈奕迅 - 爱情转移(国)': '把爱情转移，转移到你身上。',
    '陈奕迅 - 富士山下': '富士山下，樱花如雪，思念如雨。',
    '陈奕迅 - 最佳损友': '最好的朋友，也是最好的回忆。',

    '郭顶 - 水星记': '两个人，围绕着彼此转，就像水星记里写的那样。',
    '郭顶 - 凄美地': '凄美地，有人在等你，有人在爱你。',

    '隔壁老樊 - 别怕 我在': '别怕，无论什么时候，我都在。',
    '隔壁老樊 - 多想在平庸的生活拥抱你': '就算平凡，也想每天都拥抱你。',
    '隔壁老樊 - 醒着醉': '想你的感觉，像是清醒着喝醉了。',

    '郁可唯 - 删了吧': '有些东西舍不得删，因为里面有你。',
    '郁可唯 - 水中花': '水中花，镜中月，明知触碰不到还是伸出手。',

    '单依纯 - 想你时风起': '风一起，就想起你了。',
    '单依纯 - 爱的回归线 (Live版)': '绕了一圈，还是回到你身边。',
    '单依纯 - 下雨天 (Live)': '下雨天，最想听的声音是你的名字。',
    '单依纯 - 给电影人的情书 (Live)': '每一帧都像是在写给你的情书。',
    '单依纯 - 踮起脚尖爱 (Live版)': '踮起脚尖，努力去触碰你。',

    '那英 - 默': '有些心情，只有沉默才说得清。',
    '那英 - 梦一场': '如果是梦，希望梦里一直有你。',

    '张杰 - 我们都一样': '你不孤单，我们都一样在认真生活。',
    '张杰 - 他不懂': '他不懂你，但我懂。',
    '张杰 - 夜空中最亮的星 (Live)': '你是我夜空中最亮的那颗星。',
    '张杰 - 今生今世': '今生今世，只认你一个。',
    '张杰 - 着魔': '遇见你，就像被你施了魔法。',
    '张杰 - 明天过后': '无论明天之后是什么，今晚我都想陪着你。',
    '张杰 - 最接近天堂的地方': '有你的地方，就是最接近天堂的地方。',

    '张宇 - 雨一直下': '雨一直下，思念一直在。',
    '张宇 - 月亮惹的祸': '都是月亮惹的祸，让我这么想你。',
    '张宇 - 给你们': '这首歌，是唱给你们的。',
    '张宇 - 趁早': '如果爱，就趁早。',
    '张宇 - 囚鸟': '爱一个人，就像被困住的鸟。',
    '张宇 - 单恋一枝花': '单恋就像一枝花，孤独地开着。',

    '张芸京 - 偏爱': '偏偏是你，让我偏爱到无法自拔。',
    '苏运莹 - 野子': '野子，自由而真实，像极了你的眼神。',
    '王贰浪 - 往后余生': '往后余生，都想和你一起过。',
    '王贰浪 - 盔甲': '你是我最软的心，也是我最硬的盔甲。',
    '王贰浪 - 你也没有错': '你没有错，只是我们的缘分到了。',

    '八三夭 - 想见你想见你想见你': '想见你，想见你，想见你。',
    '逃跑计划 - 夜空中最亮的星': '夜空再黑，你是最亮的那一颗。',

    '鬼卞 - 只想要你知道': '只想让你知道，我认真地喜欢过你。',
    '鬼卞 - 佳人': '佳人，是你在我眼里永远的样子。',
    '鬼卞 - 蝴蝶效应': '遇见你，改变了所有。',
    '鬼卞 - 与你何涉': '与你有关的一切，都与我有关。',
    '鬼卞 - 雌雄难辨': '有时候爱一个人，分不清是你还是我先动心。',

    '李荣浩 - 年少有为': '年少时的我，没想到会这么喜欢你。',
    '李荣浩 - 我看着你的时候': '看着你，就什么都不用说了。',
    '李荣浩 - 在一起嘛好不好': '简单的一句话，装满了期待。',

    '张信哲 - 爱如潮水': '爱如潮水，一浪接一浪地涌向你。',
    '张信哲 - 别怕我伤心': '别怕我伤心，只要你开心就好。',

    '莫文蔚 - 阴天': '阴天不代表没有阳光，只是躲起来了。',
    '莫文蔚 - 如果没有你': '如果没有你，我就不完整了。',

    '梁咏琪 - 短发': '剪了短发，是为了新的开始。',
    '梁咏琪 - 胆小鬼': '在爱里，每个人都是胆小鬼。',

    '陶喆 - 爱我还是他': '你的心里，真的只有我吗？',

    '周传雄 - 黄昏': '黄昏时刻，最想牵着你的手。',
    '周兴哲 - 永不失联的爱': '不管走多远，爱你这件事永远不断线。',

    '徐佳莹 - 一样的月光': '同一片月光下，思念的是同一个你。',
    '徐佳莹 - 一样的月光 (Live)': '同一片月光下，思念的是同一个你。',

    '黄丽玲 - 幸福了 然后呢': '幸福了，然后呢？然后更幸福。',
    '黄丽玲 - 有一种悲伤': '有一种悲伤，叫做明明爱你却说不出口。',
    '黄丽玲 - 失恋无罪': '爱过了，输了也不是罪。',
    '黄丽玲 - 失恋无罪 (A-Lin 2013 Feel-Lin)': '爱过了，输了也不是罪。',

    '李宗盛 - 给自己的歌': '认真地活过，认真地爱过，就够了。',
    '李宗盛 - 鬼迷心窍': '被你迷住，无法自拔。',

    '萧亚轩 - 错的人': '错的时间遇见对的人，是心里最深的遗憾。',
    '柏松 - 世间美好与你环环相扣': '所有美好，都和你连在一起。',
    '张钰琪 - 陪你度过漫长岁月': '漫长岁月里，你是最温柔的那部分。',
    '枯木逢春 - 这一生关于你的风景': '这一生，最美的风景，是你。',
    '沈以诚 - 好奇': '好奇你想的是什么，好奇你的一切。',
    '满舒克 - 慢热': '慢热的人爱起来，更加认真。',
    '颜人中 - 遇到': '遇到你，是所有巧合里最好的一个。',
    '颜人中 - 晚安': '晚安，愿你在梦里也被温柔对待。',
    '颜人中 - 下一个天亮': '等到下一个天亮，还是会想起你。',
    '高旭 - 不做你的朋友': '不想做你的朋友，只想做你最重要的人。',
    '王天阳 - 借月': '借一轮明月，把思念带给你。',
    '蓝心羽 - 阿拉斯加海湾': '有些感情，像阿拉斯加的海湾，辽阔又安静。',
    '刘可以 - 阿拉斯加海湾': '把思念放在阿拉斯加的海湾，任它漂流。',
    '于文文 - 奉陪': '你的每一段路，我都愿意奉陪。',
    '于潼 - 寂寞沙洲冷': '寂寞的时候，有这首歌陪着你。',
    '陈柏宇 - 行尸走肉': '遇见你之前，不知道自己只是行尸走肉。',
    '戚薇 - 如果爱忘了': '有些爱，忘不了，就也别勉强忘。',
    '井胧 - 丢了你': '丢了你，才知道有多重要。',
    '曲肖冰 - 天亮以前说再见': '天亮以前，把所有想说的都说了。',
    '韩红,孙楠 - 美丽的神话': '爱是一个美丽的神话，你让它变成真实。',
    '曹格,卓文萱 - 梁山伯与茱丽叶': '隔了时空，爱还是爱。',
    '段弋,hanji - 223\'s': '两个人，两百二十三个秘密。',

    // New Chinese additions
    '邓丽君 - 甜蜜蜜': '你笑起来，整个世界都是甜的。',
    '邓丽君 - 我只在乎你': '任时光匆匆流去，我只在乎你。',
    '邓丽君 - 你怎么说': '你说什么都好，因为是你说的。',
    '赵咏华 - 最浪漫的事': '最浪漫的事，就是和你一起慢慢变老。',
    '张韶涵 - 隐形的翅膀': '每个人心里都有一双翅膀，带你飞向你想去的地方。',
    '王菲 - 红豆': '还没为你把红豆熬成缠绵的伤口。',
    '刀郎 - 西海情歌': '西海的风，吹的都是对你的思念。',
    '娃娃 - 飘洋过海来看你': '飘洋过海，只是为了见你一面。',
    '庾澄庆 - 情非得已': '爱上你，是情非得已。',
    '庾澄庆 - 春泥': '化作春泥，也是因为爱。',
    '许美静 - 遗憾': '遗憾，是爱情里最常见的结局。',
    '萨顶顶 - 左手指月': '左手指月，右手牵你。',
    '许嵩 - 雅俗共赏': '雅俗共赏的，不只是歌，还有对你的感情。',
    '许嵩 - 半城烟沙': '半城烟沙，一世牵挂。',
    '许嵩 - 如果当时': '如果当时，我会不会更勇敢一点。',
    '许嵩 - 山水之间': '山水之间，念的都是你。',
    '许嵩 - 燕归巢': '燕归巢，我归你。',
    '李健 - 传奇': '只是因为在人群中多看了你一眼。',
    '水木年华 - 一生有你': '一生有你，就是最好的安排。',
    '陈淑桦 - 笑红尘': '红尘多可笑，痴情最无聊。',
    '费玉清 - 千里之外': '千里之外，思念不减。',
    '郑智化 - 水手': '他说风雨中这点痛算什么。',
    '郑源 - 一万个理由': '一万个理由，都不如一句我想你。',
    '郑源 - 不要在我寂寞的时候说爱我': '寂寞的时候，最怕听到这首歌。',
    '郭静 - 下一个天亮': '下一个天亮，我还是会想起你。',
    '萧敬腾 - 怎么说我不爱你': '怎么说我不爱你，连自己都骗不过。',
    '胡彦斌 - 月光': '月光洒在窗台上，像你的温柔。',
    '胡彦斌 - 红颜': '红颜弹指老，刹那芳华。',
    '杨丞琳 - 雨爱': '雨中的爱，最难忘。',
    '阿牛 - 桃花朵朵开': '桃花朵朵开，好运滚滚来。',
    '陈瑞 - 白狐': '千年修行，只为等你回头。',
    '凤凰传奇 - 等爱的玫瑰': '等爱的玫瑰，盛开在你的世界。',
    '韩宝仪 - 舞女泪': '舞女泪，滴滴都是为了谁。',
    '蔡依林 - 大艺术家': '你是大艺术家，画出了最美的我。',
    '王心凌 - 当你': '当你笑了，世界都变明亮了。',
    '林忆莲,杨啟（满汉女神） - 为你我受冷风吹': '为你，我什么都愿意承受。',
    '萧潇 - 爱要坦荡荡': '爱就要坦荡荡，不藏不躲。',
    '杨培安 - 爱上你是一个错': '爱上你如果是错，我宁愿一错再错。',
    '刘欢 - 凤凰于飞': '凤凰于飞，翙翙其羽。',
    '周华健 - 有没有一首歌会让你想起我': '有没有一首歌，会让你想起我。',
    '戴佩妮 - 怎样': '怎样，我都是爱你的那个。',
    '印子月 - 落空': '所有的期待，最后都落了空。',
    '田一龙 - 一定要爱你': '这辈子，一定要爱你。',
    '办桌二人组 - 在心里从此永远有个你': '在心里，从此永远有个你。',
    '龙梅子 - 爱情专属权': '我的爱情，专属给你。',
    '王力宏 - 唯一': '你就是我的唯一。',
    '庞龙 - 你是我的玫瑰花': '你是我的玫瑰花，开在我心间。',
    '丁当 - 我爱他': '我爱他，轰轰烈烈最疯狂。',
    '缘为冰 - 千年': '千年等一回，只为遇见你。',
    '李炜 - 剑魂': '剑魂不灭，爱亦不灭。',
    '徐良 - 那时雨': '那时雨，淋湿了回忆。',
    '小匆匆 - 若梦': '若梦，你我相逢。',
    '尹昔眠 - 落在生命里的光': '你是落在我生命里的那道光。',
    '孙子涵 - 唐人': '唐人街的灯，照亮了回家的路。',
    '陈慧琳 - 今生你作伴': '今生有你作伴，什么都不怕。',
    '群星 - 因为爱情': '因为爱情，简单的生长。',
    '许飞 - 我要的飞翔': '我要的飞翔，是有你在的方向。',
    '袁成杰 - 爱情睡醒了': '爱情睡醒了，才发现你一直在身边。',
    '孟庭苇 - 羞答答的玫瑰静悄悄地开': '羞答答的玫瑰，静悄悄地为你开。',
    '安琥 - 天使的翅膀': '天使的翅膀，护你一世安好。',
    '小黑 - 天使的翅膀': '天使的翅膀，静静守护着你。',
    '蔡琴 - 南屏晚钟 (Remastered)': '晚钟响起的时候，想起的都是你。',
    '曾沛慈 - 一个人想着一个人': '一个人的时候，最想另一个人。',
    '曹格 - 寂寞寂寞不好': '寂寞寂寞不好，有你就好了。',
    '杜宣达 - 如果可以': '如果可以，想一直陪在你身边。',
    '陈奕迅 - 富士山下': '富士山下，思念如雪落满心底。',
    '林俊杰 - 曹操': '爱你，也需要几分勇气和魄力。',
    '林俊杰 - 一千年以后': '一千年以后，我要在人群中一眼认出你。',
    '王赫野 - 大风吹': '大风吹乱了头发，吹不乱对你的心意。',
    '凤凰传奇 - 大声唱': '大声唱出对你的喜欢。',
    '张碧晨 - 光的方向 (Live)': '朝着光的方向，就能找到你。',
    '张碧晨 - 梦幻诛仙': '梦幻诛仙，你的名字是我的咒语。',
    '张远 - 看着我的眼睛说': '看着我的眼睛，说你爱我。',
    '胡杨林 - 香水有毒': '香水有毒，但为你，我愿意中毒。',
    '陈文杰的音悦 - 爱要坦荡荡': '爱要光明正大，不藏不掖。',
    '戴羽彤 - 我们俩': '我们俩，就是最好的故事。',
    '张宇 - 给你们': '这首歌，送给世上所有相爱的人。',
    '张宇 - 囚鸟': '爱得太深，像一只囚鸟。',
    '张宇 - 月亮惹的祸': '月亮惹的祸，让我这么想你。',
    '张宇 - 单恋一枝花': '单恋如花，独自开在风里。',
    ' 加木 - 两 难': '进退两难的时候，听听这首歌。',
    '梦境里的算法 - 天赋': '爱你，是天生的天赋。',
    '孙盛希 - 少一点天份': '爱一个人，不需要太多天分。',
    '杨千嬅,王俊凯 - 花好月圆夜 (Live)': '花好月圆的夜晚，最适合想你。',
    '王婧,老狼 - 想把我唱给你听': '想把我唱给你听，趁现在年少如花。',
    '徐良,小凌 - 客官不可以': '客官不可以，因为心里只有你。',
    '黄子弘凡,肖俊(XIAOJUN) - 人鱼的眼泪 (Live版)': '人鱼的眼泪，是为你流的。',
    '张艺兴,火风 - 大花轿 (feat.火风)': '用大花轿，把你娶回家。',
    '微醺卡带 - 你是我的玫瑰花': '你是我的玫瑰花，独一无二。',
    '微醺卡带 - 微醺卡带-香水有毒-微醺卡带': '微醺的时候，最想和你说说话。',
    '微醺卡带 - 我要找到你': '不管多远，都要找到你。',
    '浪漫的大呲花 - 认真的雪 (R&B版)': '认真的雪，落在认真的心上。',
    '红碎片 - 冲动的惩罚（R&B）': '冲动的惩罚，就是更想你。',
    '余翊 - 童话 R&B': '童话里的爱情，R&B里有你的味道。',
    '音乐风格电台 - 模特 (R&B版)': '做你的模特，画最美的我。',
    '炫动小霸王 - 墨染': '墨染青衣，思念入骨。',
    'Capt. Lilia Iwasko - 日不落r&b': '日不落的地方，有你在等我。',
    'moonlight - 黄昏（R&B版）': '黄昏里，R&B的节奏是你的心跳。',
    'By2 - 爱的双重魔力': '爱的双重魔力，让我欢喜让我忧。',
    'Sweety - 樱花草': '樱花草开的时候，就是我想你的时候。',
    'FORMOSA - 前世今生': '前世今生，我都愿意遇见你。',
    'HuiuioOo,Crybird - 乖乖 (连不上我wifi)': '连不上wifi，连得上你的心。',
    'Xun - 我要找到你': '不管你在哪里，我都要找到你。',
    '颜人中 - 恶作剧 (Live版)': '所有的恶作剧，都是想引起你的注意。',
    '刘至佳 - 危险派对 (live版)': '危险的派对，因为你变得安全。',
    '揽小 - 和气生财': '和气生财，和你生爱。',
    '男才女貌 - 外滩十八号': '外滩十八号，等风也等你。',
    '王赫野,姚晓棠 - 虹之间 (Live版)': '虹之间，是我对你的想念。',
    '周传雄,陆虎 - 寂寞沙洲冷 (Live)': '寂寞沙洲，因为有你不冷。',
    '杨宗纬,宝石Gem,王宇宙Leto - 若月亮没来 (Live版)': '若月亮没来，就用这首歌替它陪你。',
    'GAI周延,戴佩妮 - 用情 (Live版)': '用情至深，就是这首歌的温度。',
    '薛之谦,韩红 - 小尖尖': '小尖尖，是你的小脾气。',
    '伍佰 & China Blue - 梦醒时分': '梦醒时分，最想看见的是你。',
    '张翰,朱梓骁,魏晨 - 星空物语': '星空物语，说的是你和我的故事。',

    // English
    'Ed Sheeran - Perfect': '你就是那个完美的人。',
    'Ed Sheeran - Shape of You': '形状不同，偏偏契合在一起。',
    'Adele - Easy On Me': '对我温柔一点，就像这首歌一样。',
    'The Chainsmokers,Coldplay - Something Just Like This': '不需要超级英雄，只想要这样的你。',
    'Taylor Swift - Cruel Summer': '残忍的夏天，因为你而变得值得。',
    'Justin Bieber - Yummy': '你甜甜的笑容，比这首歌还要上瘾。',
    'Justin Bieber - ALL I CAN TAKE': '能撑住的，都是为了你。',
    'Justin Bieber - BAD HONEY': '甜蜜的事，不一定都是好的。',
    'Justin Bieber - BETTER MAN': '因为你，想成为更好的人。',
    'Justin Bieber - BUTTERFLIES': '每次见你，心里都有蝴蝶在飞。',
    'Justin Bieber - DAISIES': '雏菊花海，都不如你。',
    'Justin Bieber - EYE CANDY': '你是所有目光里最好看的那一个。',
    'Justin Bieber - LOVE SONG': '所有情歌，都是为你写的。',
    'Justin Bieber - NEED IT': '不需要很多，只需要你。',
    'Justin Bieber - SPEED DEMON': '爱上你的速度，比什么都快。',
    'Justin Bieber - WALKING AWAY': '转身离开，是最难的事。',
    'Justin Bieber - WITCHYA': '和你在一起，一切都对。',
    'Justin Bieber - YUKON': 'YUKON的冬天，不如你的温暖。',
    'Justin Bieber - 405': '405号公路上，想的是你。',

    'Anthem Lights,Megan Davies - A Thousand Years': '等你，等了一千年。',
    'Anthem Lights - As Long as You Love Me': '只要你爱我，就什么都够了。',
    'Camila Cabello - This Love': '这份爱，一直都在。',
    'Lukas Graham - 7 Years': '七岁时的梦想，长大后你出现了。',
    'Alan Walker - Faded': '消失在人群里，但对你来说，我一直都在。',
    'OneRepublic - Apologize': '有些遗憾，只能用音乐来表达。',
    'Owl City - Enchanted': '遇见你那一刻，我被彻底迷住了。',
    'SLANDER,Dylan Matthew - Love Is Gone (Acoustic)': '爱消散了，但曾经有过，就值得。',
    'Jeremy Zucker,Bea Miller - comethru': '深夜里，希望你能过来陪我。',
    'Tamas Wells - Valder Fields': '有你的地方，才是我想去的地方。',
    'Bruno Major - Easily': '爱上你，太容易了，轻而易举就沦陷了。',
    'Lauv - Love Somebody': '想爱一个人，想爱得很认真。',
    'Michael Hoppé - How Do I Love Thee': '用所有能想到的方式，爱你。',
    'Richard Clayderman - Mariage d\'amour (Paul de Senneville)': '爱情的旋律，只需要钢琴就足够了。',
    'Ariana Grande,Justin Bieber - Stuck with U': '被困在和你在一起的时光里，甘之如饴。',
    'Westlife - Seasons In The Sun': '那些阳光灿烂的日子，是因为你在。',
    'MOCCA - I Remember': '我记得，每一个关于你的瞬间。',
    'Chris Medina - What Are Words': '只要你在，什么语言都不需要。',
    'Anson Seabra - Keep Your Head Up Princess': '抬起头，你值得最好的一切。',
    'Powfu,Kuzu Mellow - met at a party': '在最普通的地方相遇，却是最特别的故事。',
    'Sasha Alex Sloan - Dancing With Your Ghost': '你不在了，但那支舞我还记得。',
    'Savage Ga$p - an ocean of stars couldn\'t keep us apart': '整片星海，也拦不住我找到你的心。',
    'GIVĒON - Stuck On You': '粘在你身上，不想离开。',
    'Kendrick Lamar,SZA - luther': '有些旋律，一听就放不下。',
    'Lady Gaga,Bruno Mars - Die With A Smile': '就算是最后一天，也要笑着想你。',
    'Rihanna - Kiss It Better': '有些伤，亲吻就能愈合。',
    'Sufjan Stevens - Mystery of Love': '爱是最大的谜，永远解不完。',
    'Sufjan Stevens - Visions of Gideon': '那些幻象里，都是你的影子。',
    'Troye Sivan - Strawberries & Cigarettes': '草莓和香烟，甜中带涩。',
    'Dan + Shay,Justin Bieber - 10,000 Hours': '一万个小时，只想用来了解你。',
    'Ed Sheeran,Taylor Swift - The Joker And The Queen (feat. Taylor Swift)': '小丑和王后，偏偏是最好的一对。',
  }

  if (customReasons[key]) return customReasons[key]
  return genericReason(primaryMood)
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — Scan, classify, write
// ═══════════════════════════════════════════════════════════════════════════

const allFiles = fs.readdirSync(SONGS_DIR).filter(f => /\.mp3$/i.test(f)).sort()
console.log(`Classifying ${allFiles.length} songs...\n`)

const songs = allFiles.map(f => classify(f))

// Stats
const tagCounts = {}
const stats = { total: songs.length, multiMood: 0, avgTags: 0 }
songs.forEach(s => {
  s.moodTags.forEach(t => tagCounts[t] = (tagCounts[t]||0)+1)
  if (s.moodTags.length >= 3) stats.multiMood++
})
stats.avgTags = (songs.reduce((sum,s)=>sum+s.moodTags.length,0) / songs.length).toFixed(2)

console.log('Mood distribution:')
Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) =>
  console.log(`  ${k}: ${v} songs`)
)
console.log(`\nMulti-mood songs (3+ tags): ${stats.multiMood}/${stats.total}`)
console.log(`Average tags per song: ${stats.avgTags}`)

// Score distributions
console.log('\nScore distribution (averages):')
const avgScores = { emotionalIntensity:0, warmthLevel:0, solitudeLevel:0, nightListeningScore:0 }
songs.forEach(s => {
  avgScores.emotionalIntensity += s.emotionalIntensity
  avgScores.warmthLevel += s.warmthLevel
  avgScores.solitudeLevel += s.solitudeLevel
  avgScores.nightListeningScore += s.nightListeningScore
})
Object.entries(avgScores).forEach(([k,v]) =>
  console.log(`  ${k}: ${(v/songs.length).toFixed(1)}`)
)

// ── Write songMoodMap.js ──────────────────────────────────────────────
const lines = songs.map(s => `  {
    title: ${JSON.stringify(s.title)},
    artist: ${JSON.stringify(s.artist)},
    src: ${JSON.stringify(s.src)},
    moodTags: ${JSON.stringify(s.moodTags)},
    energyLevel: ${JSON.stringify(s.energyLevel)},
    emotionalDescription: ${JSON.stringify(s.emotionalDescription)},
    bestFor: ${JSON.stringify(s.bestFor)},
    romanticReason: ${JSON.stringify(s.romanticReason)},
    emotionalIntensity: ${s.emotionalIntensity},
    warmthLevel: ${s.warmthLevel},
    solitudeLevel: ${s.solitudeLevel},
    nightListeningScore: ${s.nightListeningScore},
  }`)

const moodMapOutput = `// Auto-generated — run: node scripts/classifyAllSongs.js
// Song fields: title, artist, src (local /songs/ path), moodTags, energyLevel,
//              emotionalDescription, bestFor, romanticReason,
//              emotionalIntensity, warmthLevel, solitudeLevel, nightListeningScore
// To switch to CDN: set CDN_BASE in src/data/songConfig.js
export const songMoodMap = [\n${lines.join(',\n')}\n]\n`

fs.writeFileSync(MOOD_MAP_PATH, moodMapOutput, 'utf8')
console.log(`\n✓ Wrote ${songs.length} songs → src/data/songMoodMap.js`)

// ── Write songLibrary.json ────────────────────────────────────────────
fs.mkdirSync(path.dirname(LIBRARY_JSON_PATH), { recursive: true })
fs.writeFileSync(LIBRARY_JSON_PATH, JSON.stringify(songs, null, 2), 'utf8')
console.log(`✓ Wrote ${songs.length} songs → public/data/songLibrary.json`)
console.log(`\nDone. ${songs.length} songs fully reclassified.`)
