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
const LOOKUP_PATH = path.resolve(__dirname, './songNameLookup.json')

// ── Kebab → readable artist/title lookup (438 entries from pre-rename metadata) ─
const nameLookup = JSON.parse(fs.readFileSync(LOOKUP_PATH, 'utf8'))

// ── Kebab-to-readable helpers ──────────────────────────────────────────────
function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

function cleanKebabAsTitle(raw) {
  // Reverse common sanitization: hyphens → spaces, contractions
  return titleCase(
    raw.replace(/^(\d+)-/g, '$1 ')           // "7-rings" → "7 Rings"
       .replace(/-/g, ' ')                   // all dashes → spaces
       .replace(/\bi m\b/gi, "I'm")          // i m → I'm
       .replace(/\bcan t\b/gi, "Can't")      // can t → Can't
       .replace(/\bcouldn t\b/gi, "Couldn't")
       .replace(/\bdon t\b/gi, "Don't")
       .replace(/\bdidn t\b/gi, "Didn't")
       .replace(/\bwon t\b/gi, "Won't")
       .replace(/\bit s\b/gi, "It's")
       .replace(/\bthat s\b/gi, "That's")
       .replace(/\bwhat s\b/gi, "What's")
       .replace(/\bain t\b/gi, "Ain't")
       .replace(/\bwanna\b/gi, 'Wanna')
       .replace(/\bgonna\b/gi, 'Gonna')
       .replace(/\s+/g, ' ')
       .trim()
  )
}

function cleanKebabAsArtist(raw) {
  // "alec-benjamin-alessia-cara" → "Alec Benjamin, Alessia Cara"
  // But "aaron-smith-luvli-krono" → artist names joined by commas
  // Single dashes between names suggest featured artists
  return titleCase(
    raw.replace(/--/g, ' / ')          // double-dash = title separator (shouldn't be in artist)
       .replace(/-/g, ' ')            // single dash = space between names
       .replace(/\s+/g, ' ')
       .trim()
  )
}

// ── Parse helpers ──────────────────────────────────────────────────────────
function parseName(filename) {
  const base = filename.replace(/\.mp3$/i, '')

  // 1. Standard format: "Artist - Title" (Chinese-name files)
  const dash = base.indexOf(' - ')
  if (dash !== -1) {
    return { artist: base.slice(0, dash).trim(), title: base.slice(dash + 3).trim() }
  }

  // 2. Kebab-slug with known mapping (438 songs renamed by rename-songs.js)
  const known = nameLookup[base]
  if (known) {
    return { artist: known.artist, title: known.title }
  }

  // 3. Kebab-slug with -- separator: "artist-name--song-title"
  const dd = base.indexOf('--')
  if (dd !== -1) {
    const artistRaw = base.slice(0, dd)
    const titleRaw = base.slice(dd + 2)
    return {
      artist: cleanKebabAsArtist(artistRaw),
      title: cleanKebabAsTitle(titleRaw),
    }
  }

  // 4. Last resort — clean the raw name as a title
  return { artist: '', title: cleanKebabAsTitle(base) }
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

  const primaryMood = uniqueTags[0] || '想一个人发呆'

  // ── Song-specific emotional generation ───────────────────────────
  const emotionalDescription = describeSong(title, artist, primaryMood, energyLevel, uniqueTags, full, zh)
  const bestFor = bestForSong(title, artist, primaryMood, energyLevel, uniqueTags, full, zh)
  const romanticReason = romanticReasonForSong(title, artist, primaryMood, uniqueTags, energyLevel, full, zh)

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
// SONG-SPECIFIC EMOTIONAL GENERATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
//
// Every song gets a unique emotional description / bestFor / romanticReason
// generated from its title imagery, artist identity, mood combination,
// energy level, and sonic personality — never generic templates.
//
// Principles:
//   - Each line should feel like a memory, a cinematic scene, an emotional fragment
//   - No repeated "late-night" or "generic comfort" phrases
//   - Title words seed the imagery so each song feels specific
//   - Deterministic: same song always gets the same line

// ── Title word → emotional imagery fragments ─────────────────────────────
// Each character maps to imagery categories used by the template engine.

const ZH_IMAGERY = {
  '雨': { s:['雨声','雨停','下雨天','雨夜','雨打在窗上'], e:['思念','安静','等待'], a:['等雨停','听雨','淋雨'], t:['雨','伞','窗'] },
  '夜': { s:['深夜','凌晨','夜幕','夜的深处','夜深人静'], e:['独处','安静','想念'], a:['失眠','醒着','望着窗外'], t:['夜色','灯','枕边'] },
  '爱': { s:['爱里','相遇时','在一起时'], e:['悸动','温柔','坚定'], a:['爱着','珍惜','抱紧'], t:['心跳','手','目光'] },
  '梦': { s:['梦里','梦醒之间','枕边'], e:['恍惚','期盼','柔软'], a:['入梦','醒来','梦见'], t:['梦','枕','呼吸'] },
  '光': { s:['光落下时','微光里','逆光中'], e:['温暖','希望','安心'], a:['照亮','发着光','追光'], t:['光','影','窗'] },
  '海': { s:['海边','海浪声里','海风中'], e:['辽阔','思念','自由'], a:['望海','听海','等浪来'], t:['海','浪','岸'] },
  '风': { s:['风里','起风时','晚风中','风穿过'], e:['自由','想念','轻快'], a:['吹风','等风来','随风'], t:['风','发梢'] },
  '星': { s:['星空下','星光里','银河'], e:['孤独','期盼','渺小'], a:['看星星','数星星'], t:['星','夜空'] },
  '花': { s:['花开时','花落处','花丛里'], e:['温柔','珍惜','短暂'], a:['看花','等花开','闻花香'], t:['花','瓣','春'] },
  '雪': { s:['雪落时','雪地里','白茫茫'], e:['安静','思念','纯净'], a:['看雪','等雪停','踩雪'], t:['雪','白','冷'] },
  '月': { s:['月光下','月圆时','弯月'], e:['思念','温柔','孤独'], a:['望月','等月圆','踏月'], t:['月','月光'] },
  '心': { s:['心里','心跳声里'], e:['悸动','柔软','坚定'], a:['心动','心疼','放心'], t:['心','胸口'] },
  '泪': { s:['眼泪里','哭过之后'], e:['难过','释怀','疲惫'], a:['流泪','擦干','忍住'], t:['泪','脸庞'] },
  '路': { s:['路上','归途','分岔路'], e:['漂泊','期待','坚定'], a:['赶路','等你','回头'], t:['路','灯'] },
  '水': { s:['水边','流水旁'], e:['安静','流动','温柔'], a:['看水','听水声','顺流'], t:['水','河','涟漪'] },
  '城': { s:['城市里','霓虹中','街角'], e:['孤独','归属','漂泊'], a:['穿行','停留','离开'], t:['城','街','窗'] },
  '歌': { s:['旋律里','副歌响起时','前奏'], e:['共鸣','陪伴','治愈'], a:['听歌','唱给你','单曲循环'], t:['歌','音符','耳机'] },
  '静': { s:['安静里','沉默中'], e:['独处','思考','平静'], a:['静静','不说话','发呆'], t:['静','空'] },
  '等': { s:['等待时','站台','路口'], e:['期盼','焦灼','耐心'], a:['等一个人','等天亮','等你'], t:['等','钟'] },
  '忘': { s:['忘记的边缘','想起时'], e:['遗憾','释怀','怀念'], a:['忘记','记起','放下'], t:['忘','回忆'] },
  '笑': { s:['笑声里','微笑时','嘴角'], e:['快乐','温暖','轻松'], a:['笑了','逗你笑','看着你笑'], t:['笑','酒窝'] },
  '哭': { s:['哭声里','忍住的时候'], e:['难过','释放','委屈'], a:['哭了','忍着','偷偷哭'], t:['泪','眼'] },
  '念': { s:['思念里','想起时','回忆中'], e:['温柔','酸涩','温暖'], a:['念着','想起','惦记'], t:['念','信'] },
  '暖': { s:['温暖中','被暖到的时候'], e:['幸福','安心','柔软'], a:['取暖','被暖','暖手'], t:['暖','温度'] },
  '天': { s:['天空下','天际线','云端'], e:['辽阔','自由','渺小'], a:['抬头','望天','放空'], t:['天','云','蓝'] },
  '地': { s:['大地','土地上'], e:['踏实','归属','辽阔'], a:['落下来','生根','停靠'], t:['地','泥'] },
  '火': { s:['火光里','燃烧时'], e:['炽热','冲动','热烈'], a:['点燃','取暖','燃尽'], t:['火','灰'] },
  '山': { s:['山间','山顶','山谷'], e:['辽阔','坚定','安静'], a:['爬山','远眺','停驻'], t:['山','峰'] },
  '秋': { s:['秋天','落叶时','微凉'], e:['萧瑟','思念','安静'], a:['看落叶','踏秋'], t:['秋','叶'] },
  '春': { s:['春天','花开时','回暖'], e:['温柔','希望','新生'], a:['等春天','感受暖意'], t:['春','花'] },
  '冬': { s:['冬天','寒冷中'], e:['沉寂','等待','温暖'], a:['过冬','取暖','等雪'], t:['冬','冷'] },
  '夏': { s:['夏天','蝉鸣中','阳光'], e:['热烈','自由','悸动'], a:['晒太阳','吹夏风'], t:['夏','热'] },
  '雾': { s:['雾里','看不清时'], e:['迷茫','暧昧','等待'], a:['穿雾','等雾散'], t:['雾','朦胧'] },
  '烟': { s:['烟雾中','散开时'], e:['飘渺','恍惚','消散'], a:['点燃','看烟散'], t:['烟','灰'] },
  '酒': { s:['微醺时','酒杯旁'], e:['释怀','孤独','放松'], a:['喝酒','微醺','醉了'], t:['酒','杯'] },
  '舞': { s:['舞池中','旋转时'], e:['自由','快乐','释放'], a:['跳舞','旋转','摆动'], t:['舞','步'] },
  '独': { s:['一个人时','独处','空房间'], e:['孤独','安静','自在'], a:['独处','自洽','习惯'], t:['自己','房间'] },
  '孤': { s:['孤独里','一个人时'], e:['孤单','释怀','习惯'], a:['一个人','安静','独行'], t:['孤','影'] },
  '离': { s:['离开时','分开后','远方'], e:['难过','思念','成长'], a:['离开','告别','远行'], t:['离','远方'] },
  '归': { s:['归来时','回家路上'], e:['安心','期盼','温暖'], a:['归来','回家','等归'], t:['归','家'] },
  '家': { s:['家里','回家路上','窗台'], e:['安心','温暖','归属'], a:['回家','等你','守着'], t:['家','灯'] },
  '时': { s:['时间中','钟声里'], e:['流逝','珍惜','回顾'], a:['等待','回想','留住'], t:['时间','钟'] },
  '年': { s:['那年','经年之后','岁月'], e:['怀念','感慨','温柔'], a:['回想','等过年','长大'], t:['年','岁月'] },
  '远': { s:['远方','遥远的地方'], e:['思念','期盼','无力'], a:['远望','走远','追不上'], t:['远','距离'] },
  '近': { s:['靠近时','身边'], e:['亲密','安心','温暖'], a:['靠近','贴近','依偎'], t:['近','身旁'] },
  '晚': { s:['傍晚','黄昏','夜晚'], e:['安静','放松','思念'], a:['等天黑','散步','看日落'], t:['黄昏','晚霞'] },
  '晨': { s:['清晨','天亮时','晨曦'], e:['希望','新鲜','安静'], a:['早起','等天亮','呼吸'], t:['晨','光'] },
  '夕': { s:['夕阳下','黄昏'], e:['温馨','感伤','安静'], a:['看夕阳','散步'], t:['夕阳','余晖'] },
  '暮': { s:['暮色里','黄昏','天快黑'], e:['安静','思念','放松'], a:['等天黑','看暮色'], t:['暮','晚'] },
  '红': { s:['红色里','热烈的颜色'], e:['热烈','深情','炽热'], a:['染红','映红'], t:['红','热度'] },
  '蓝': { s:['蓝色里'], e:['忧郁','安静','深邃'], a:['变蓝','染蓝'], t:['蓝','忧郁'] },
  '白': { s:['白色中','空白处'], e:['纯净','简单','安静'], a:['留白','空白'], t:['白','空'] },
  '黑': { s:['黑暗里','夜色中'], e:['孤独','沉静','深邃'], a:['沉浸','摸索'], t:['黑','夜'] },
  '落': { s:['落下时','飘落中'], e:['无力','释怀','结束'], a:['落下来','飘落','落下'], t:['落','叶'] },
  '飘': { s:['漂浮中','飘着的时候'], e:['自由','恍惚','轻盈'], a:['漂着','飘远','浮着'], t:['飘','云'] },
  '飞': { s:['飞起时','天空中'], e:['自由','向往','轻快'], a:['起飞','飞翔','飞远'], t:['飞','翅膀'] },
  '追': { s:['追寻中','追赶时'], e:['渴望','坚持','焦灼'], a:['追逐','追赶','追不上'], t:['追','跑'] },
  '失': { s:['失去后','失落中'], e:['遗憾','难过','空虚'], a:['失去','失落','放手'], t:['失','空'] },
  '得': { s:['获得时','拥有时'], e:['满足','幸福','珍惜'], a:['得到','拥有','抱着'], t:['得','握'] },
  '见': { s:['见面时','看见时'], e:['期待','悸动','幸福'], a:['见到','遇见','看见'], t:['见','眼'] },
  '遇': { s:['遇见时','邂逅'], e:['奇妙','温暖','缘分'], a:['遇见','碰到','相遇'], t:['遇','缘'] },
  '别': { s:['告别时','分开前'], e:['不舍','难过','祝福'], a:['告别','说再见','离开'], t:['别','手'] },
  '散': { s:['散场时','散落中'], e:['失落','释怀','结束'], a:['散场','散落','消散'], t:['散','场'] },
  '留': { s:['留下时','留住后'], e:['珍惜','不舍','温柔'], a:['留下','留住','停留'], t:['留','守'] },
  '回': { s:['回去时','回头处'], e:['怀念','期盼','释怀'], a:['回头','回去','回想'], t:['回','转'] },
  '走': { s:['离开时','走在路上','走远'], e:['漂泊','坚定','释怀'], a:['走远','走开','走了'], t:['走','路'] },
  '停': { s:['停下来时','停顿处'], e:['安静','思考','疲惫'], a:['停下','歇着','暂停'], t:['停','歇'] },
  '跑': { s:['奔跑中','加速时'], e:['自由','热烈','释放'], a:['奔跑','跑远','跑着'], t:['跑','风'] },
  '死': { s:['死心里','终结时'], e:['绝望','结束','不留'], a:['死心','终结'], t:['死','终'] },
  '吻': { s:['吻时','唇间'], e:['亲密','温柔','悸动'], a:['亲吻','轻吻','吻你'], t:['吻','唇'] },
}

// English title word imagery
const EN_IMAGERY = {
  'love':  { s:['in love','when it hits'], e:['tender','aching'], a:['falling in love','loving quietly'], t:['heartbeat','hands'] },
  'lost':  { s:['getting lost','somewhere between'], e:['wandering','searching'], a:['getting lost','finding your way back'], t:['map','road'] },
  'night': { s:['late at night','while the world sleeps'], e:['quiet','alone'], a:['staying up late','watching the dark'], t:['moon','bedside light'] },
  'dream': { s:['between dreams','half awake'], e:['drifting','longing'], a:['dreaming of you','waking up slow'], t:['pillow','dream'] },
  'easy':  { s:['taking it easy','letting go'], e:['gentle','calm'], a:['going easy','letting things be'], t:['breath','quiet'] },
  'fade':  { s:['fading out','disappearing slow'], e:['melancholy','quiet'], a:['fading','letting go'], t:['fade','vanishing'] },
  'alone': { s:['being alone','your own company'], e:['quiet','self-contained'], a:['sitting alone','staying in'], t:['room','silence'] },
  'stay':  { s:['staying','not leaving yet'], e:['wanting','hoping'], a:['staying here','waiting a bit more'], t:['door','hand'] },
  'goodbye': { s:['saying goodbye','the last look'], e:['aching','final'], a:['walking away','letting go'], t:['door','last word'] },
  'dance': { s:['on the floor','moving'], e:['free','alive'], a:['dancing alone','swaying slow'], t:['beat','feet'] },
  'river': { s:['by the river','flowing'], e:['moving on','endless'], a:['watching it flow','drifting'], t:['river','water'] },
  'remember': { s:['looking back','flipping through'], e:['nostalgic','warm'], a:['remembering you','holding on'], t:['memory','photo'] },
  'sorry':  { s:['after the apology','regretting'], e:['heavy','aching'], a:['saying sorry','wishing you could'], t:['sorry','regret'] },
  'home':   { s:['going home','where you belong'], e:['safe','gentle'], a:['coming home','returning'], t:['home','doorway'] },
  'run':    { s:['running','heart pounding'], e:['urgent','free'], a:['running away','chasing'], t:['pace','breath'] },
  'fall':   { s:['falling','the descent'], e:['helpless','surrendering'], a:['falling hard','letting gravity take'], t:['fall','ground'] },
  'light':  { s:['in the light','when it breaks through'], e:['hopeful','warm'], a:['catching the light','being lit up'], t:['light','glow'] },
  'dark':   { s:['in the dark','where no one sees'], e:['hidden','deep'], a:['sitting in the dark','waiting'], t:['dark','shadow'] },
  'heart':  { s:['in your heart','heartbeat'], e:['beating','loud'], a:['holding it in','letting it beat'], t:['heart','chest'] },
  'rain':   { s:['in the rain','after it stops'], e:['washing away','fresh'], a:['standing in it','waiting for it to stop'], t:['rain','window'] },
  'fire':   { s:['by the fire','burning'], e:['intense','consuming'], a:['catching fire','burning slow'], t:['fire','spark'] },
  'ocean':  { s:['by the ocean','vast blue'], e:['endless','deep'], a:['staring at waves','getting lost'], t:['ocean','wave'] },
  'wind':   { s:['in the wind','carried away'], e:['weightless','drifting'], a:['letting the wind take it','feeling it pass'], t:['wind','breeze'] },
  'star':   { s:['under the stars','watching them'], e:['small','hopeful'], a:['counting stars','wishing on one'], t:['star','sky'] },
  'hurt':   { s:['after it hurts','the ache'], e:['raw','tender'], a:['hurting quietly','feeling it'], t:['hurt','scar'] },
  'miss':   { s:['missing someone','the absence'], e:['longing','hollow'], a:['missing you','not being there'], t:['miss','gap'] },
  'hold':   { s:['holding on','not letting go'], e:['tight','warm'], a:['holding close','keeping you'], t:['hold','embrace'] },
  'song':   { s:['in this song','the melody'], e:['moving','personal'], a:['singing along','humming it'], t:['song','note'] },
  'broken': { s:['broken pieces','after it breaks'], e:['fragile','aching'], a:['picking up pieces','mending'], t:['crack','piece'] },
  'wait':   { s:['waiting','the in-between'], e:['patient','aching'], a:['waiting for you','counting time'], t:['wait','clock'] },
  'fly':    { s:['in the air','taking off'], e:['free','weightless'], a:['flying away','lifting off'], t:['fly','wing'] },
  'slow':   { s:['slowing down','taking time'], e:['calm','present'], a:['slowing the pace','breathing in'], t:['slow','pause'] },
  'breathe': { s:['catching breath','exhaling'], e:['release','calm'], a:['breathing out','letting it go'], t:['breath','air'] },
  'mystery': { s:['in the mystery','unanswered'], e:['curious','quiet'], a:['wondering','leaving it unknown'], t:['mystery','question'] },
  'strange': { s:['feeling strange','out of place'], e:['lost','adrift'], a:['wandering','not fitting in'], t:['strange','drift'] },
  'wonder': { s:['in wonder','looking around'], e:['amazed','gentle'], a:['wondering','marveling'], t:['wonder','awe'] },
  'heaven': { s:['near heaven','almost there'], e:['bliss','light'], a:['reaching','almost touching'], t:['heaven','above'] },
  'roses':  { s:['with roses','among petals'], e:['romantic','sweet'], a:['giving roses','holding them'], t:['rose','petal'] },
  'cherry': { s:['under cherry blossoms'], e:['delicate','spring'], a:['watching petals fall'], t:['cherry','blossom'] },
  'angel':  { s:['with angels','guarded'], e:['protected','soft'], a:['being watched over'], t:['angel','wing'] },
  'king':   { s:['wearing a crown','ruling'], e:['strong','proud'], a:['standing tall','owning it'], t:['crown','throne'] },
  'queen':  { s:['wearing a crown','ruling'], e:['powerful','beautiful'], a:['ruling','shining'], t:['crown','queen'] },
  'monster': { s:['with monsters','hiding'], e:['scared','hidden'], a:['hiding the monster','being scared'], t:['monster','hide'] },
  'paper':  { s:['on paper','written down'], e:['fragile','remembered'], a:['writing it down','folding it'], t:['paper','fold'] },
  'castle': { s:['in a castle','protected'], e:['safe','grand'], a:['building castles','living inside'], t:['castle','wall'] },
  'ghost':  { s:['like a ghost','haunting'], e:['haunting','unseen'], a:['haunting quietly','being invisible'], t:['ghost','whisper'] },
  'golden': { s:['golden light','the gold hour'], e:['warm','precious'], a:['turning gold','glowing'], t:['gold','glow'] },
}

// ── Helper: extract dominant imagery from a title ────────────────────────
function extractImagery(title, artist) {
  const zh = []  // [{ char, scene, emotion, action, thing }]
  const en = []  // [{ word, scene, emotion, action, thing }]

  // Chinese character scan
  for (const ch of title) {
    const img = ZH_IMAGERY[ch]
    if (img) zh.push({ ch, ...img })
  }
  // Also scan artist for Chinese chars
  for (const ch of artist) {
    const img = ZH_IMAGERY[ch]
    if (img && !zh.find(x => x.ch === ch)) zh.push({ ch, ...img })
  }

  // English word scan
  const words = title.toLowerCase().split(/[\s\-–—,.;:!?()（）《》"'']+/)
  for (const w of words) {
    const img = EN_IMAGERY[w]
    if (img) en.push({ word: w, ...img })
  }

  return { zh, en }
}

// ── Deterministic seed from string ───────────────────────────────────────
function pickFrom(s, arr) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return arr[Math.abs(h) % arr.length]
}

function pickIndex(s, len) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) % len
}

// ── Energy texture ───────────────────────────────────────────────────────
const ENERGY_TEXTURE = {
  '高': { pace:['快节奏','跃动','充满活力','不羁'], verb:['冲','跳起来','加速','释放'], feel:['痛快','畅快','淋漓'] },
  '中': { pace:['缓缓流动','轻轻','舒展','自在'], verb:['摆动','摇晃','漂着','走着'], feel:['舒服','自在','刚刚好'] },
  '低': { pace:['慢下来','柔软','安静','轻到几乎没有'], verb:['坐下来','歇着','靠着','闭上眼'], feel:['安静','柔软','小心翼翼'] },
}

// ── Mood-specific tone fragments ─────────────────────────────────────────
const MOOD_TONE = {
  '想你了':       { verbs:['想念','惦记','想起','想着'], nouns:['思念','记忆','距离','时间','夜'], adj:['温柔','酸涩','挥之不去','淡淡'] },
  '开心开心':     { verbs:['笑了','晃起来','跟着节拍','摇'], nouns:['快乐','节奏','笑容','好天气','风'], adj:['轻盈','跳跃','闪闪发光','自在'] },
  '今天很幸福':   { verbs:['珍惜','抱着','感受','留住'], nouns:['幸福','温度','满足','此刻','暖意'], adj:['温暖','满满','软软','甜'] },
  '需要安慰':     { verbs:['陪着你','轻轻拍着','抱着','靠着'], nouns:['安慰','陪伴','眼泪','夜晚','肩膀'], adj:['温柔','安静','不说破','耐心'] },
  '想被抱抱':     { verbs:['抱住','靠近','贴紧','依偎'], nouns:['拥抱','温度','怀抱','安全感','手臂'], adj:['柔软','暖暖','紧紧包裹','安心'] },
  '有点苦恼':     { verbs:['想着','绕了又绕','解不开','纠结'], nouns:['心事','烦恼','结','死胡同','乱麻'], adj:['说不清','若隐若现','纠缠','闷闷'] },
  '洗澡放松一下': { verbs:['冲掉','放下','放空','漂着'], nouns:['热水','雾气','疲惫','浴室','泡泡'], adj:['暖暖','轻飘飘','什么都不想','融化'] },
  '想一个人发呆': { verbs:['发呆','漂着','走神','放空'], nouns:['空白','思绪','窗外','空气','浮云'], adj:['空空','安静','漫无目的','淡淡'] },
  '今天有点累':   { verbs:['躺下来','歇着','闭上眼睛','放下'], nouns:['疲惫','床','今天','重量','身体'], adj:['沉沉','软软','不想动','缓缓'] },
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. EMOTIONAL DESCRIPTION  (1 line, 15-40 chars, a poetic emotional tag)
// ═══════════════════════════════════════════════════════════════════════════

function describeSong(title, artist, primaryMood, energyLevel, allMoods, full, zh) {
  const img = extractImagery(title, artist)
  const tone = MOOD_TONE[primaryMood] || MOOD_TONE['想一个人发呆']
  const energy = ENERGY_TEXTURE[energyLevel] || ENERGY_TEXTURE['中']
  const seed = title + primaryMood

  // Pick adj/noun safely
  const adj = () => pickFrom(seed + 'adj', tone.adj)
  const noun = () => pickFrom(seed + 'noun', tone.nouns)

  const patterns = [
    // 1. imagery scene + emotion: "雨声里的温柔"
    () => {
      if (img.zh.length > 0) {
        const i = pickFrom(seed + 'p1a', img.zh)
        return `${pickFrom(seed + 'p1b', i.s)}里的${adj()}`
      }
      if (img.en.length > 0) {
        const i = pickFrom(seed + 'p1c', img.en)
        return `${pickFrom(seed + 'p1d', i.s)}, ${adj()}`
      }
      return `${pickFrom(seed + 'p1e', energy.pace)}的${noun()}`
    },
    // 2. action + feeling: "等雨停时的酸涩"
    () => {
      if (img.zh.length > 0) {
        const i = pickFrom(seed + 'p2a', img.zh)
        return `${pickFrom(seed + 'p2b', i.a)}的${adj()}`
      }
      if (img.en.length > 0) {
        const i = pickFrom(seed + 'p2c', img.en)
        return `the ${adj()} of ${pickFrom(seed + 'p2d', i.a)}`
      }
      return `${pickFrom(seed + 'p2e', energy.verb)}的${noun()}`
    },
    // 3. thing-based: "窗里的思念"
    () => {
      if (img.zh.length > 0) {
        const i = pickFrom(seed + 'p3a', img.zh)
        return `${pickFrom(seed + 'p3b', i.t)}里的${noun()}`
      }
      return `${pickFrom(seed + 'p3c', energy.feel)}的${adj()}`
    },
    // 4. emotion in scene: "安静中的温柔"
    () => {
      if (img.zh.length > 0) {
        const i = pickFrom(seed + 'p4a', img.zh)
        return `${pickFrom(seed + 'p4b', i.e)}里的${adj()}`
      }
      return `${pickFrom(seed + 'p4c', energy.feel)}的${noun()}`
    },
    // 5. English cinematic: "the tenderness in falling"
    () => {
      if (img.en.length > 0) {
        const i = pickFrom(seed + 'p5a', img.en)
        return `the ${pickFrom(seed + 'p5b', i.e)} in ${pickFrom(seed + 'p5c', i.a)}`
      }
      return `${adj()}的${pickFrom(seed + 'p5d', energy.feel)}`
    },
    // 6. pure texture: two adjs or adj+noun
    () => `${adj()}的${noun()}`,
    // 7. action: "漂着的空白"
    () => `${pickFrom(seed + 'p7a', tone.verbs)}的${noun()}`,
    // 8. pace + mood
    () => `${pickFrom(seed + 'p8a', energy.pace)}的${adj()}`,
  ]

  return pickFrom(seed, patterns)()
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. BEST FOR  (1 line, 20-60 chars, a personal, specific recommendation)
// ═══════════════════════════════════════════════════════════════════════════

function bestForSong(title, artist, primaryMood, energyLevel, allMoods, full, zh) {
  const img = extractImagery(title, artist)
  const tone = MOOD_TONE[primaryMood] || MOOD_TONE['想一个人发呆']
  const seed = title + 'best'

  const patterns = [
    // 1. Scene-anchored: "当雨声响起，按下播放键"
    () => {
      if (img.zh.length > 0) {
        const i = pickFrom(seed + 'b1', img.zh)
        return `当${pickFrom(seed + 'b2', i.s)}，按下播放键`
      }
      if (img.en.length > 0) {
        const i = pickFrom(seed + 'b3', img.en)
        return `when ${pickFrom(seed + 'b4', i.s)}, press play`
      }
      return `${pickFrom(seed + 'b5', tone.verbs)}的时候，闭上眼睛听`
    },
    // 2. Action: "等雨停的那几分钟"
    () => {
      if (img.zh.length > 0) {
        const i = pickFrom(seed + 'b6', img.zh)
        return `${pickFrom(seed + 'b7', i.a)}的那几分钟`
      }
      return `${pickFrom(seed + 'b8', tone.verbs)}的那几分钟`
    },
    // 3. Specific mood-tied moment (handcrafted, varied per mood)
    () => {
      const moments = {
        '想你了': ['想念一个人却不想说出来时','翻到旧照片的那一刻','深夜收到一条消息后'],
        '开心开心': ['嘴角不自觉上扬时','想跟着节奏轻轻晃时','今天的快乐需要一个BGM'],
        '今天很幸福': ['想把这份温暖轻轻留住时','觉得一切都刚刚好的那一刻','心里满满当当的时候'],
        '需要安慰': ['不是不想说，只是不想解释时','眼泪快掉下来的时候','需要一个声音安静陪着时'],
        '想被抱抱': ['想被紧紧抱着的时候','需要一点体温的那一刻','想靠在谁身上歇一会儿'],
        '有点苦恼': ['心里绕来绕去绕不出来时','有些事想不通又放不下的那一刻','需要给自己一点空间的时候'],
        '洗澡放松一下': ['用热水冲掉一天疲惫时','什么都不想就那么待着的时候','浴室雾气升起来的那一刻'],
        '想一个人发呆': ['望着窗外放空的那一刻','思绪飘到哪儿算哪儿的时候','一个人安静待着的时光'],
        '今天有点累': ['今天真的很努力了之后','躺在床上不想动的那一刻','需要一个温柔的声音接住你时'],
      }
      const arr = moments[primaryMood] || moments['想一个人发呆']
      return pickFrom(seed + 'b9', arr)
    },
    // 4. Scene + emotion combo (for songs with 2+ imagery hits)
    () => {
      if (img.zh.length >= 2) {
        const a = pickFrom(seed + 'b10', img.zh)
        const rest = img.zh.filter(x => x !== a)
        const b = pickFrom(seed + 'b11', rest.length ? rest : img.zh)
        return `${pickFrom(seed + 'b12', a.s)}，${pickFrom(seed + 'b13', b.e)}的时候`
      }
      if (img.zh.length === 1) {
        const i = img.zh[0]
        return `${pickFrom(seed + 'b14', i.s)}的${pickFrom(seed + 'b15', tone.nouns)}`
      }
      return `${pickFrom(seed + 'b16', tone.nouns)}涌上来的那一刻`
    },
    // 5. Simple recommendation
    () => `${pickFrom(seed + 'b17', tone.verbs)}的时候，是这首歌的时间`,
  ]

  return pickFrom(seed, patterns)()
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ROMANTIC REASON  (1-3 lines, 30-120 chars — a memory, scene, fragment)
// ═══════════════════════════════════════════════════════════════════════════

function romanticReasonForSong(title, artist, primaryMood, allMoods, energyLevel, full, zhText) {
  const img = extractImagery(title, artist)
  const tone = MOOD_TONE[primaryMood] || MOOD_TONE['想一个人发呆']
  const seed = title + artist + primaryMood

  // ── First: check special per-song custom reasons (kept from original) ──
  const key = `${artist} - ${title}`
  const CUSTOM = customReasonMap()
  if (CUSTOM[key]) return CUSTOM[key]

  // ── Build context for template selection ──
  const hasChinese = /[一-鿿]/.test(title)
  const hasEnglish = /[a-zA-Z]{3,}/.test(title)
  const imgRich = img.zh.length >= 2 || img.en.length >= 2

  // ── Template banks ──
  // Type A: "有些X，Y还是会Z。" (melancholy, nostalgic)
  const typeA = () => {
    const i = img.zh.length > 0 ? pickFrom(seed + 'a1', img.zh) : null
    const j = img.zh.length > 1 ? pickFrom(seed + 'a2', img.zh.filter(x => x !== i)) : i
    const ti = i ? pickFrom(seed + 'a3', i.t) : null
    const tj = j ? pickFrom(seed + 'a4', j.t) : null
    const thing = (ti && tj) ? `${ti}和${tj}` : (ti || pickFrom(seed + 'a5', tone.nouns))
    const verb = i ? pickFrom(seed + 'a6', i.a) : pickFrom(seed + 'a7', tone.verbs)
    return `有些${thing}，${verb}的时候还是会想起你。`
  }

  // Type B: "[scene]的时候，[feeling]。" (specific moment)
  const typeB = () => {
    if (img.zh.length > 0) {
      const i = pickFrom(seed + 'b1', img.zh)
      const feeling = pickFrom(seed + 'b2', tone.adj)
      return `${pickFrom(seed + 'b3', i.s)}的时候，${feeling}。`
    }
    if (img.en.length > 0) {
      const i = pickFrom(seed + 'b4', img.en)
      return `${pickFrom(seed + 'b5', i.s)} — ${pickFrom(seed + 'b6', tone.adj)}.`
    }
    return `${pickFrom(seed + 'b7', tone.nouns)}的时候，${pickFrom(seed + 'b8', tone.verbs)}。`
  }

  // Type C: "[thing]里藏着[secret]，只有这首歌知道。" (intimate secret)
  const typeC = () => {
    const i = img.zh.length > 0 ? pickFrom(seed + 'c1', img.zh) : null
    const thing = i ? pickFrom(seed + 'c2', i.t) : pickFrom(seed + 'c3', tone.nouns)
    const secret = pickFrom(seed + 'c4', tone.nouns)
    return `${thing}里藏着的${secret}，只有按下播放键才会浮起来。`
  }

  // Type D: "不是不想X，只是Y。" (deflection, understatement)
  const typeD = () => {
    const imgObj = img.zh.length > 0 ? pickFrom(seed + 'd1', img.zh) : null
    const verb1 = imgObj ? pickFrom(seed + 'd1b', imgObj.a) : pickFrom(seed + 'd2', tone.verbs)
    const rest = img.zh.length > 1 ? img.zh.filter(x => x !== img.zh[0]) : null
    const imgObj2 = rest && rest.length > 0 ? pickFrom(seed + 'd3', rest) : null
    const reason = imgObj2 ? pickFrom(seed + 'd3b', imgObj2.e) : pickFrom(seed + 'd4', tone.adj)
    return `不是不想${verb1}，只是有些${reason}，还没准备好。`
  }

  // Type E: "如果X有Y，大概就是这首歌的样子。" (hypothetical)
  const typeE = () => {
    const i = img.zh.length > 0 ? pickFrom(seed + 'e1', img.zh) : null
    const x = i ? pickFrom(seed + 'e2', i.e) : pickFrom(seed + 'e3', tone.nouns)
    const y = pickFrom(seed + 'e4', tone.nouns)
    return `如果${x}有${y}，大概就是这首歌的样子。`
  }

  // Type F: "那天[todo]的时候，[something happened]。" (memory)
  const typeF = () => {
    if (img.zh.length > 0) {
      const i = pickFrom(seed + 'f1', img.zh)
      const j = pickFrom(seed + 'f2', tone.adj)
      return `那天${pickFrom(seed + 'f3', i.s)}，突然懂了什么叫${j}。`
    }
    if (img.en.length > 0) {
      const i = pickFrom(seed + 'f4', img.en)
      return `the moment ${pickFrom(seed + 'f5', i.s)}, something shifted.`
    }
    return `那天${pickFrom(seed + 'f6', tone.verbs)}的时候，突然有些明白了。`
  }

  // Type G: "X和Y之间，隔着Z。" (distance, gap)
  const typeG = () => {
    const a = pickFrom(seed + 'g1', tone.nouns)
    const imgObj1 = img.zh.length > 0 ? pickFrom(seed + 'g2', img.zh) : null
    const b = imgObj1 ? pickFrom(seed + 'g2b', imgObj1.e) : pickFrom(seed + 'g3', tone.adj)
    const rest = img.zh.length > 1 ? img.zh.filter(x => x !== img.zh[0]) : null
    const imgObj2 = rest && rest.length > 0 ? pickFrom(seed + 'g4', rest) : null
    const c = imgObj2 ? pickFrom(seed + 'g4b', imgObj2.t) : pickFrom(seed + 'g5', tone.nouns)
    return `${a}和${b}之间，隔着${c}。`
  }

  // Type H: "[action]，轻轻地，像[intro]的旋律。" (cinematic, music-anchored)
  const typeH = () => {
    const imgObj1 = img.zh.length > 0 ? pickFrom(seed + 'h1', img.zh) : null
    const action = imgObj1 ? pickFrom(seed + 'h1b', imgObj1.a) : pickFrom(seed + 'h2', tone.verbs)
    const imgObj2 = img.zh.length > 0 ? pickFrom(seed + 'h3', img.zh) : null
    const like = imgObj2 ? pickFrom(seed + 'h3b', imgObj2.e) : pickFrom(seed + 'h4', tone.adj)
    return `${action}，轻轻地，像${like}落在枕边。`
  }

  // Type I: "有些问题不需要回答，有些[thing]不需要理由。" (rhetorical)
  const typeI = () => {
    const imgObj = img.zh.length > 0 ? pickFrom(seed + 'i1', img.zh) : null
    const thing = imgObj ? pickFrom(seed + 'i1b', imgObj.t) : pickFrom(seed + 'i2', tone.nouns)
    return `有些问题不需要回答，有些${thing}不需要理由。`
  }

  // Type J: "你大概不知道，[secret]。" (confessional)
  const typeJ = () => {
    const imgObj = img.zh.length > 0 ? pickFrom(seed + 'j1', img.zh) : null
    const verb = imgObj ? pickFrom(seed + 'j1b', imgObj.a) : pickFrom(seed + 'j2', tone.verbs)
    const noun = pickFrom(seed + 'j3', tone.nouns)
    return `你大概不知道，${verb}，是关于你的${noun}。`
  }

  // Type K: "[X]不是[X]，是[Y]。" (redefinition)
  const typeK = () => {
    const i = img.zh.length > 0 ? pickFrom(seed + 'k1', img.zh) : null
    const x = i ? pickFrom(seed + 'k2', i.t) : pickFrom(seed + 'k3', tone.nouns)
    const y = pickFrom(seed + 'k4', tone.nouns)
    return `${x}不是${x}，是还没说出口的${y}。`
  }

  // Type L: English-specific intimate fragment
  const typeL = () => {
    if (img.en.length > 0) {
      const i = pickFrom(seed + 'l1', img.en)
      const j = pickFrom(seed + 'l2', tone.adj)
      return `the space between ${pickFrom(seed + 'l3', i.s)} and ${j} is thinner than you think.`
    }
    const i = img.zh.length > 0 ? pickFrom(seed + 'l4', img.zh) : null
    if (i) return `${pickFrom(seed + 'l5', i.s)}的${pickFrom(seed + 'l6', tone.nouns)}，像一首还没写完的诗。`
    return `${pickFrom(seed + 'l7', tone.nouns)}${pickFrom(seed + 'l8', tone.adj)}，像一首还没写完的诗。`
  }

  // Type M: "[artist]唱这首歌的时候，[feeling]。" (artist-anchored)
  const typeM = () => {
    const shortArtist = artist.split(/[,，]/)[0].trim()
    const feeling = pickFrom(seed + 'm1', tone.adj)
    return `${shortArtist}唱这首歌的时候，${feeling}。`
  }

  // Type N: "[time/place]的[thing]，[action]。" (atmospheric)
  const typeN = () => {
    if (img.zh.length > 0) {
      const i = pickFrom(seed + 'n1', img.zh)
      const j = img.zh.length > 1 ? pickFrom(seed + 'n2', img.zh.filter(x => x !== i)) : i
      return `${pickFrom(seed + 'n3', i.s)}${pickFrom(seed + 'n4', j.e)}，${pickFrom(seed + 'n5', tone.adj)}。`
    }
    if (img.en.length > 0) {
      const i = pickFrom(seed + 'n6', img.en)
      return `${pickFrom(seed + 'n7', i.s)} ${pickFrom(seed + 'n8', i.e)}, breathing slow.`
    }
    return `${pickFrom(seed + 'n9', tone.nouns)}里，${pickFrom(seed + 'n10', tone.verbs)}。`
  }

  // Type O: cinematic single-line scene
  const typeO = () => {
    if (img.zh.length >= 2) {
      const a = pickFrom(seed + 'o1', img.zh)
      const b = pickFrom(seed + 'o2', img.zh.filter(x => x !== a))
      return `${pickFrom(seed + 'o3', a.s)}，${pickFrom(seed + 'o4', b.e)}，${pickFrom(seed + 'o5', tone.nouns)}。`
    }
    if (img.zh.length === 1) {
      const i = img.zh[0]
      return `${pickFrom(seed + 'o6', i.s)}，${pickFrom(seed + 'o7', tone.adj)}，${pickFrom(seed + 'o8', tone.nouns)}。`
    }
    return `${pickFrom(seed + 'o9', tone.adj)}，${pickFrom(seed + 'o10', tone.nouns)}，${pickFrom(seed + 'o11', tone.verbs)}。`
  }

  // Type P: "那些[adj]的[thing]，后来都变成了[noun]。" (retrospective)
  const typeP = () => {
    const adj = pickFrom(seed + 'p1', tone.adj)
    const imgObj = img.zh.length > 0 ? pickFrom(seed + 'p2', img.zh) : null
    const thing = imgObj ? pickFrom(seed + 'p2b', imgObj.t) : pickFrom(seed + 'p3', tone.nouns)
    const noun = pickFrom(seed + 'p4', tone.nouns)
    return `那些${adj}的${thing}，后来都变成了${noun}。`
  }

  // Type Q: English poetic fragment
  const typeQ = () => {
    if (img.en.length > 0) {
      const i = pickFrom(seed + 'q1', img.en)
      return `${pickFrom(seed + 'q2', i.a)} — quietly, without telling anyone.`
    }
    return `有些旋律听过就忘，有些你一唱就是一辈子。`
  }

  // Type R: "[emotion]不是[emotion]，是[redefinition]。"
  const typeR = () => {
    const e1 = pickFrom(seed + 'r1', tone.nouns)
    const imgObj = img.zh.length > 0 ? pickFrom(seed + 'r2', img.zh) : null
    const e2 = imgObj ? pickFrom(seed + 'r2b', imgObj.e) : pickFrom(seed + 'r3', tone.adj)
    return `${e1}不是${e1}，是${e2}的另一种说法。`
  }

  // Type S: "你不在的时候，[thing]都变[adj]了。"
  const typeS = () => {
    const imgObj = img.zh.length > 0 ? pickFrom(seed + 's1', img.zh) : null
    const thing = imgObj ? pickFrom(seed + 's1b', imgObj.s) : pickFrom(seed + 's2', tone.nouns)
    const adj = pickFrom(seed + 's3', tone.adj)
    return `你不在的时候，${thing}都变${adj}了。`
  }

  // Type T: "如果有一天[action]，这首歌就是答案。"
  const typeT = () => {
    const imgObj = img.zh.length > 0 ? pickFrom(seed + 't1', img.zh) : null
    const action = imgObj ? pickFrom(seed + 't1b', imgObj.a) : pickFrom(seed + 't2', tone.verbs)
    return `如果有一天你${action}，这首歌就是答案。`
  }

  // Type U: very short, cinematic, title-specific
  const typeU = () => {
    if (img.zh.length > 0) {
      const i = pickFrom(seed + 'u1', img.zh)
      return `${pickFrom(seed + 'u2', i.e)}在${pickFrom(seed + 'u3', i.t)}里，${pickFrom(seed + 'u4', tone.adj)}。`
    }
    return `它知道。`
  }

  // ── Select template based on song characteristics ──
  const allTypes = [typeA, typeB, typeC, typeD, typeE, typeF, typeG, typeH, typeI, typeJ, typeK, typeL, typeM, typeN, typeO, typeP, typeQ, typeR, typeS, typeT, typeU]

  // Favor certain types based on song attributes
  let candidates = allTypes
  // For English songs, prefer L/Q
  if (hasEnglish && !hasChinese) {
    candidates = [typeL, typeQ, typeB, typeF, typeM, typeN, typeA, typeC, typeH, typeD, typeE, typeG]
  }
  // For imagery-rich songs, prefer scene-based types
  if (imgRich) {
    const sceneTypes = [typeA, typeB, typeC, typeF, typeG, typeH, typeO, typeN, typeS, typeU]
    candidates = [...sceneTypes, ...candidates.filter(t => !sceneTypes.includes(t))]
  }
  // For low energy, avoid brash types
  if (energyLevel === '低') {
    candidates = candidates.filter(t => t !== typeE)
  }

  // Pick from weighted candidates
  return pickFrom(seed + 'main', candidates)()
}

// ── Custom reason map: specific artist-title pairs ───────────────────────
// These are the original handcrafted entries — preserved because they capture
// something specific that even a good template would miss.
function customReasonMap() {
  return {
    '薛之谦 - 演员': '每个人心里都有一个角色，只是不想再演了。',
    '薛之谦 - 暧昧': '暧昧是比喜欢更难说出口的东西。',
    '薛之谦 - 意外': '所有的爱都是意外，遇见你也是。',
    '薛之谦 - 绅士': '最温柔的，是懂得克制的爱。',
    '薛之谦 - 刚刚好': '不早不晚，在对的时候遇见你。',
    '薛之谦 - 你还要我怎样': '有些话说了不如不说，不说又太难熬。',
    '薛之谦 - 下雨了': '下雨了，只是想问问你有没有带伞。',
    '薛之谦 - 天份': '爱你，是我这辈子最好的天分。',
    '薛之谦 - 方圆几里': '方圆几里，只要你在，就是全世界。',
    '薛之谦 - 一半': '你占了我的一半，另一半也想给你。',
    '薛之谦 - 像风一样': '像风一样把你围绕，让你感觉到我。',
    '薛之谦 - 哑巴': '有些话，只能用沉默来说。',
    '薛之谦 - 小孩': '在你面前，我永远只想做个小孩。',
    '薛之谦 - 动物世界': '喜欢你这件事，比我想象的还要认真。',
    '薛之谦 - 怪咖': '怪的人遇见怪的人，就是缘分。',
    '薛之谦 - 几个你': '如果有几个你，每一个都想好好珍惜。',
    '薛之谦 - 陪你去流浪': '你去哪里，我就去哪里，不需要理由。',
    '薛之谦 - 这么久没见': '这么久没见，你还是我想的样子。',
    '林俊杰 - 江南': '烟雨江南，最适合想一个人。',
    '林俊杰 - 她说': '有些话，只有音乐说得出口。',
    '林俊杰 - 茉莉雨': '雨里有你的影子，茉莉香里有你的名字。',
    '林俊杰 - 记得': '记得你的每一个细节，一直都记得。',
    '林俊杰 - 一千年以后': '一千年以后，我要在人群中一眼认出你。',
    '林俊杰,蔡卓妍 - 小酒窝': '你笑起来的样子，是这世界上最好看的。',
    '周深 - 雪落下的声音 (Live)': '雪落下来的声音，安静得像你的名字。',
    '周深 - Monsters (Live)': '每个人心里都有一只怪兽，被你温柔对待时才安静下来。',
    '陈粒 - 光': '你是所有黑暗里透进来的那道光。',
    '陈粒 - 走马': '走马观花，唯独你让我停下来。',
    '陈粒 - 小半': '你不是全部，你是比全部还多的那一点。',
    '陈粒 - 奇妙能力歌': '有你的世界，多了一种奇妙的颜色。',
    '陈粒 - 种种': '种种可能，我只想要有你的那一种。',
    '毛不易 - 呓语': '半梦半醒之间，说的都是你。',
    '毛不易 - 像我这样的人': '像我这样的人，也在认认真真地爱你。',
    '孙燕姿 - 遇见': '遇见，是所有故事最好的开头。',
    '孙燕姿 - 开始懂了': '慢慢懂了，有些人是专门来让你心动的。',
    '孙燕姿 - 雨天': '下雨天，就想听这首歌。',
    'G.E.M.邓紫棋 - 光年之外': '跨越光年，只是为了找到你。',
    'G.E.M.邓紫棋 - 句号': '有些故事，不想画上句号。',
    'G.E.M.邓紫棋 - 多远都要在一起': '不管多远，都要在一起。',
    'G.E.M.邓紫棋 - 泡沫': '有些感情，像泡沫一样美，也一样易碎。',
    'G.E.M.邓紫棋 - 来自天堂的魔鬼': '爱你是天堂，想你是魔鬼。',
    'G.E.M.邓紫棋 - 倒数': '倒数着见你的日子，一天比一天期待。',
    '梁静茹 - 勇气': '爱你，是我做过最勇敢的事。',
    '梁静茹 - 分手快乐': '爱过了，就够了。',
    '陈奕迅 - 孤独患者': '孤独的人，需要一首懂他的歌。',
    '陈奕迅 - 浮夸': '所有的热闹，都是一个人的孤独。',
    '陈奕迅 - 阴天快乐': '阴天也要快乐，因为你在。',
    '陈奕迅 - 富士山下': '富士山下，思念如雪落满心底。',
    '郭顶 - 水星记': '两个人，围绕着彼此转，就像水星记里写的那样。',
    '郭顶 - 凄美地': '凄美地，有人在等你，有人在爱你。',
    '隔壁老樊 - 别怕 我在': '别怕，无论什么时候，我都在。',
    '隔壁老樊 - 多想在平庸的生活拥抱你': '就算平凡，也想每天都拥抱你。',
    '单依纯 - 想你时风起': '风一起，就想起你了。',
    '单依纯 - 爱的回归线 (Live版)': '绕了一圈，还是回到你身边。',
    '那英 - 默': '有些心情，只有沉默才说得清。',
    '张杰 - 夜空中最亮的星 (Live)': '你是我夜空中最亮的那颗星。',
    '张杰 - 今生今世': '今生今世，只认你一个。',
    '张杰 - 明天过后': '无论明天之后是什么，今晚我都想陪着你。',
    '张宇 - 雨一直下': '雨一直下，思念一直在。',
    '张宇 - 月亮惹的祸': '都是月亮惹的祸，让我这么想你。',
    '张宇 - 趁早': '如果爱，就趁早。',
    '王贰浪 - 往后余生': '往后余生，都想和你一起过。',
    '王贰浪 - 盔甲': '你是我最软的心，也是我最硬的盔甲。',
    '八三夭 - 想见你想见你想见你': '想见你，想见你，想见你。',
    '逃跑计划 - 夜空中最亮的星': '夜空再黑，你是最亮的那一颗。',
    '邓丽君 - 我只在乎你': '任时光匆匆流去，我只在乎你。',
    '邓丽君 - 甜蜜蜜': '你笑起来，整个世界都是甜的。',
    '赵咏华 - 最浪漫的事': '最浪漫的事，就是和你一起慢慢变老。',
    '王菲 - 红豆': '还没为你把红豆熬成缠绵的伤口。',
    '娃娃 - 飘洋过海来看你': '飘洋过海，只是为了见你一面。',
    '庾澄庆 - 情非得已': '爱上你，是情非得已。',
    '张韶涵 - 隐形的翅膀': '每个人心里都有一双翅膀，带你飞向你想去的地方。',
    '李健 - 传奇': '只是因为在人群中多看了你一眼。',
    '水木年华 - 一生有你': '一生有你，就是最好的安排。',
    '许嵩 - 半城烟沙': '半城烟沙，一世牵挂。',
    '许嵩 - 如果当时': '如果当时，我会不会更勇敢一点。',
    '许嵩 - 山水之间': '山水之间，念的都是你。',
    '许嵩 - 燕归巢': '燕归巢，我归你。',
    '费玉清 - 千里之外': '千里之外，思念不减。',
    '刀郎 - 西海情歌': '西海的风，吹的都是对你的思念。',
    '李宗盛 - 给自己的歌': '认真地活过，认真地爱过，就够了。',
    '莫文蔚 - 阴天': '阴天不代表没有阳光，只是躲起来了。',
    '莫文蔚 - 如果没有你': '如果没有你，我就不完整了。',
    '张信哲 - 爱如潮水': '爱如潮水，一浪接一浪地涌向你。',
    '陶喆 - 爱我还是他': '你的心里，真的只有我吗？',
    '周传雄 - 黄昏': '黄昏时刻，最想牵着你的手。',
    '周兴哲 - 永不失联的爱': '不管走多远，爱你这件事永远不断线。',
    '徐佳莹 - 一样的月光': '同一片月光下，思念的是同一个你。',
    '黄丽玲 - 幸福了 然后呢': '幸福了，然后呢？然后更幸福。',
    '黄丽玲 - 失恋无罪': '爱过了，输了也不是罪。',
    '萧亚轩 - 错的人': '错的时间遇见对的人，是心里最深的遗憾。',
    '颜人中 - 晚安': '晚安，愿你在梦里也被温柔对待。',
    '颜人中 - 遇到': '遇到你，是所有巧合里最好的一个。',
    '于文文 - 奉陪': '你的每一段路，我都愿意奉陪。',
    '井胧 - 丢了你': '丢了你，才知道有多重要。',
    '韩红,孙楠 - 美丽的神话': '爱是一个美丽的神话，你让它变成真实。',
    '曹格,卓文萱 - 梁山伯与茱丽叶': '隔了时空，爱还是爱。',
    '杨丞琳 - 雨爱': '雨中的爱，最难忘。',
    '王力宏 - 唯一': '你就是我的唯一。',
    '许美静 - 遗憾': '遗憾，是爱情里最常见的结局。',
    '蔡琴 - 南屏晚钟 (Remastered)': '晚钟响起的时候，想起的都是你。',
    '陈瑞 - 白狐': '千年修行，只为等你回头。',
    '萨顶顶 - 左手指月': '左手指月，右手牵你。',
    '刘欢 - 凤凰于飞': '凤凰于飞，翙翙其羽。',
    '周华健 - 有没有一首歌会让你想起我': '有没有一首歌，会让你想起我。',
    '戴佩妮 - 怎样': '怎样，我都是爱你的那个。',
    '龙梅子 - 爱情专属权': '我的爱情，专属给你。',
    '蓝心羽 - 阿拉斯加海湾': '有些感情，像阿拉斯加的海湾，辽阔又安静。',
    '枯木逢春 - 这一生关于你的风景': '这一生，最美的风景，是你。',
    '柏松 - 世间美好与你环环相扣': '所有美好，都和你连在一起。',
    '尹昔眠 - 落在生命里的光': '你是落在我生命里的那道光。',
    '杜宣达 - 如果可以': '如果可以，想一直陪在你身边。',
    '曲肖冰 - 天亮以前说再见': '天亮以前，把所有想说的都说了。',
    '蔡徐坤 - Hug me (抱我)': '抱一下，比说什么都好。',
    'Ed Sheeran - Perfect': 'You look perfect tonight.',
    'Adele - Easy On Me': 'Go easy on me — I was still a child.',
    'Justin Bieber - 405': 'Driving 405, thinking of you.',
    '88rising,NIKI - La La Lost You (Acoustic Version)': '飞得再远，有些人还是会在夜里想起。',
    '24kGoldn,iann dior - Mood': '今天不用想太多，跟着节奏轻轻晃就好了。',
    '88rising,NIKI,Phum Viphurit - Strange Land (Acoustic Version)': '明明身边很多人，却还是像漂在陌生城市里。',
    '88rising,AUGUST 08,Barney Bones - Calculator': '算了又算，还是算不过自己的心。',
    'Justin Bieber - Yummy': '你一笑，连空气都是甜的。',
    'Justin Bieber - BUTTERFLIES': '你靠近的时候，我的心脏在翻跟斗。',
    'Justin Bieber - WITCHYA': '和你在一起，什么都不用想。',
    'Justin Bieber - DAISIES': '如果你是一朵花，我愿做你的土壤。',
    'Justin Bieber - YUKON': '开到Yukon，一路想的都是你。',
    'Justin Bieber,Dijon - DEVOTION': '有些付出，不需要回报。',
    'Kendrick Lamar,SZA - luther': '有些歌，一听就懂。有些人，一见就知道。',
  }
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
