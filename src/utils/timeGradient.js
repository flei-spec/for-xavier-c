// ─────────────────────────────────────────────────────────────────────────────
//  timeGradient.js
//
//  Continuous 24-hour color interpolation for the atmosphere system.
//
//  HOW IT WORKS
//  ─────────────
//  A table of 13 keyframes defines the "color story" of the sky across one day.
//  Given any fractional hour (e.g. 17.5 = 5:30 PM), the two surrounding
//  keyframes are found and all color channels are linearly interpolated.
//
//  App.jsx calls getInterpolatedTheme(fractHour, weatherType) every 60 seconds
//  and writes the results as inline CSS custom properties.  The 1.8s CSS
//  transition on body background-color makes each 1-minute step feel continuous.
//  The AtmosphereGlow component cross-fades between glow states using opacity.
//
//  ADDING NEW KEYFRAMES
//  ─────────────────────
//  Insert a new entry in KEYFRAMES (keep the array sorted by h).
//  All colors interpolate automatically — no other changes needed.
// ─────────────────────────────────────────────────────────────────────────────

// ── Keyframe table ────────────────────────────────────────────────────────────
// bg  = [r, g, b]     body background-color (--bg-deep)
// g1  = [r, g, b, a]  glow blob top-left    (--atm-glow-1)
// g2  = [r, g, b, a]  glow blob bottom-right(--atm-glow-2)

const KEYFRAMES = [
  //  h     bgDeep                 glow1 top-left                glow2 bottom-right
  { h:  0,  bg: [  4,  5, 14],  g1: [ 80, 70,180, 0.06],  g2: [ 60, 50,145, 0.04] }, // midnight — deep navy
  { h:  4,  bg: [  5,  8, 18],  g1: [ 90, 75,195, 0.07],  g2: [ 65, 55,160, 0.04] }, // late night
  { h:  5.5,bg: [ 14, 20, 40],  g1: [ 95, 90,210, 0.11],  g2: [125, 98,202, 0.07] }, // pre-dawn — hint of blue
  { h:  6.5,bg: [198,226,252],  g1: [ 75,148,252, 0.34],  g2: [160,212,255, 0.24] }, // dawn — sky brightens
  { h:  8,  bg: [226,242,255],  g1: [ 90,175,255, 0.50],  g2: [180,225,255, 0.38] }, // morning — clear sky blue
  { h: 12,  bg: [216,237,255],  g1: [ 80,168,255, 0.46],  g2: [165,215,255, 0.32] }, // midday
  { h: 15,  bg: [220,238,255],  g1: [ 85,168,252, 0.44],  g2: [170,216,255, 0.31] }, // afternoon
  { h: 16.5,bg: [226,236,252],  g1: [ 92,162,248, 0.42],  g2: [172,212,252, 0.30] }, // late afternoon — barely warmer
  { h: 17.5,bg: [255,224,182],  g1: [255,145, 58, 0.55],  g2: [222, 80,120, 0.34] }, // golden hour begins
  { h: 18.5,bg: [255,192,148],  g1: [255,122, 38, 0.68],  g2: [210, 68,115, 0.42] }, // peak golden hour — warmest
  { h: 19.2,bg: [235,148,210],  g1: [200, 75, 80, 0.50],  g2: [155, 58,158, 0.34] }, // dusk — rosy purple sky
  { h: 20,  bg: [ 26, 10, 28],  g1: [118, 60,162, 0.14],  g2: [ 90, 50,150, 0.09] }, // night falls — warm fades
  { h: 21.5,bg: [  5,  8, 18],  g1: [100, 80,205, 0.08],  g2: [ 70, 60,175, 0.05] }, // night — cinematic navy
  { h: 24,  bg: [  4,  5, 14],  g1: [ 80, 70,180, 0.06],  g2: [ 60, 50,145, 0.04] }, // back to midnight
]

// ── data-time attribute boundaries ────────────────────────────────────────────
// These control the CSS token swap (text color, card base, glass border…)
// Fractional boundaries prevent the hard snap from coinciding with glow updates.

export function getDataTime(fh) {
  if (fh >= 6.5 && fh <  17.0) return 'day'
  if (fh >= 17.0 && fh < 20.0) return 'sunset'
  return 'night'
}

// ── Weather glow modifier ─────────────────────────────────────────────────────
// Softly adjusts glow opacity without changing colour.
// Rain/storm = more muted; sunny = slightly brighter; cloudy/fog = neutral.

function weatherMod(weatherType) {
  if (weatherType === 'rain' || weatherType === 'storm') return 0.50
  if (weatherType === 'cloudy' || weatherType === 'fog') return 0.75
  if (weatherType === 'sunny')                           return 1.18
  return 1.0
}

// ── Interpolation helpers ─────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t }

function lerpArr(a, b, t) {
  return a.map((v, i) => lerp(v, b[i], t))
}

function toHex(rgb) {
  return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

function toRgba([r, g, b, a]) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Math.max(0, Math.min(1, a)).toFixed(2)})`
}

// ── Sky gradient strings (consumed by AtmosphereGlow) ─────────────────────────

export const SKY_GRADIENTS = {
  day:    'linear-gradient(180deg, #eef8ff 0%, #dceeff 50%, #f2f8ff 100%)',
  sunset: 'linear-gradient(180deg, #fff0e0 0%, #ffd8b0 18%, #ffbe98 42%, #f8a0b0 70%, #e898d8 100%)',
  night:  null,  // no sky overlay — body background-color is enough
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * getInterpolatedTheme(fractHour, weatherType?)
 *
 * @param {number} fractHour   Decimal hour in [0, 24), e.g. 17.5 = 5:30 PM
 * @param {string} weatherType 'sunny'|'cloudy'|'rain'|'storm'|'snow'|'fog'|null
 * @returns {{ bgDeep, glow1, glow2, dataTime }}
 */
export function getInterpolatedTheme(fractHour, weatherType = null) {
  // Normalise to [0, 24)
  const h = ((fractHour % 24) + 24) % 24

  // Find surrounding keyframes
  let lo = 0
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (KEYFRAMES[i + 1].h > h) { lo = i; break }
    lo = i
  }
  const kf1 = KEYFRAMES[lo]
  const kf2 = KEYFRAMES[lo + 1] ?? KEYFRAMES[lo]

  const span = kf2.h - kf1.h
  const t    = span > 0 ? (h - kf1.h) / span : 0

  const mod = weatherMod(weatherType)

  const bgArr = lerpArr(kf1.bg, kf2.bg, t)
  const g1Arr = lerpArr(kf1.g1, kf2.g1, t)
  const g2Arr = lerpArr(kf1.g2, kf2.g2, t)

  // Apply weather modifier to glow opacity only (index 3)
  g1Arr[3] = Math.min(1, g1Arr[3] * mod)
  g2Arr[3] = Math.min(1, g2Arr[3] * mod)

  const dataTime = getDataTime(h)

  return {
    bgDeep:   toHex(bgArr),
    glow1:    toRgba(g1Arr),
    glow2:    toRgba(g2Arr),
    dataTime,
    skyGradient: SKY_GRADIENTS[dataTime] ?? null,
  }
}
