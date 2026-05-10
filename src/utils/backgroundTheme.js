// ─────────────────────────────────────────────────────────────────────────────
//  backgroundTheme.js
//
//  Maps { timeOfDay, weather } → CSS custom-property values that drive the
//  full-page background gradient in index.css.
//
//  HOW IT FITS IN
//  ──────────────
//  • App.jsx calls getBackgroundTheme() and writes the returned values onto
//    :root via document.documentElement.style.setProperty().
//  • index.css reads --bg-deep (base colour), --atm-glow-1 and --atm-glow-2
//    (radial glow colours) from :root and renders the body gradient.
//  • transition: background-color 1.2s ease on body makes the change smooth.
//
//  CONNECTING A REAL WEATHER API
//  ──────────────────────────────
//  The atmosphere hook (src/hooks/useAtmosphere.js) already fetches live
//  weather from Open-Meteo and provides:
//    atmosphere.weather.type  →  'sunny' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow'
//    atmosphere.hour          →  local hour (0-23) in the user's timezone
//
//  If you want to replace Open-Meteo with a different service:
//    1. Edit getWeather() in src/hooks/useAtmosphere.js.
//    2. Map your API's response to the same type strings above.
//    3. Nothing else needs changing — getBackgroundTheme() consumes those strings.
//
//  MOCK WEATHER (for local development without API)
//  ─────────────────────────────────────────────────
//  Uncomment the line in App.jsx marked "MOCK" to force a fixed weather type.
// ─────────────────────────────────────────────────────────────────────────────

// ── Time-of-day bucket ───────────────────────────────────────────────────────
//
// Coarser than atmosphere.js's getTimePeriod() — four buckets that map to the
// four visual moods: fresh morning, bright afternoon, warm evening, dark night.

export function getTimeOfDay(hour) {
  if (hour >= 6  && hour < 11) return 'morning'    // 6 am – 11 am
  if (hour >= 11 && hour < 17) return 'afternoon'  // 11 am – 5 pm
  if (hour >= 17 && hour < 20) return 'evening'    // 5 pm – 8 pm
  return 'night'                                    // 8 pm – 6 am
}

// ── Palette table ─────────────────────────────────────────────────────────────
//
// Each entry drives three CSS custom properties:
//   bgDeep  →  --bg-deep   (body background-color; transitions smoothly)
//   glow1   →  --atm-glow-1 (radial gradient blob, top-left)
//   glow2   →  --atm-glow-2 (radial gradient blob, bottom-right)
//
// Design constraints:
//   • bgDeep stays very dark so white/cream text (#f8f0e8) remains readable.
//   • Glow colours are semi-transparent — they tint the edges without washing
//     out the glassmorphism cards that sit on top.
//   • Daytime glows lean cool-blue (sky feeling); evening leans peach-purple;
//     rainy leans deep blue; night stays the existing dark purple.

const THEMES = {

  // ── Daytime · sunny / clear ──────────────────────────────────────────────
  // Soft white-blue sky: light, airy, dreamy — clear daylight.
  morning_sunny: {
    bgDeep: '#e2f2ff',                  // soft morning sky blue
    glow1:  'rgba(90, 175, 255, 0.50)', // vivid sky-blue blob, top-left
    glow2:  'rgba(180, 225, 255, 0.38)',// pale white-blue blob, bottom-right
  },
  afternoon_sunny: {
    bgDeep: '#d8edff',                  // clear midday sky, a touch deeper
    glow1:  'rgba(80, 168, 255, 0.46)',
    glow2:  'rgba(165, 215, 255, 0.32)',
  },

  // ── Daytime · cloudy ─────────────────────────────────────────────────────
  // Pale blue-gray: muted overcast, still clearly daytime.
  morning_cloudy: {
    bgDeep: '#e4eaf5',                  // overcast soft gray-blue
    glow1:  'rgba(140, 160, 220, 0.28)',
    glow2:  'rgba(115, 138, 200, 0.20)',
  },
  afternoon_cloudy: {
    bgDeep: '#e8ecf7',                  // pale overcast
    glow1:  'rgba(130, 152, 215, 0.24)',
    glow2:  'rgba(110, 132, 195, 0.18)',
  },

  // ── Daytime · rainy / stormy ─────────────────────────────────────────────
  // Still lighter than night but muted: heavy, damp, overcast daylight.
  morning_rainy: {
    bgDeep: '#d2dff0',                  // pale rain-blue, still light
    glow1:  'rgba(80, 115, 210, 0.28)',
    glow2:  'rgba(60,  90, 185, 0.20)',
  },
  afternoon_rainy: {
    bgDeep: '#ccd9ec',
    glow1:  'rgba(70, 110, 210, 0.30)',
    glow2:  'rgba(55,  85, 190, 0.22)',
  },
  evening_rainy: {
    bgDeep: '#060810',
    glow1:  'rgba(90,90,190,0.12)',     // blue-purple, twilight rain
    glow2:  'rgba(60,70,200,0.07)',
  },
  night_rainy: {
    bgDeep: '#040810',
    glow1:  'rgba(60,95,200,0.11)',     // deep rain-blue
    glow2:  'rgba(50,80,185,0.06)',
  },

  // ── Evening / sunset ──────────────────────────────────────────────────────
  // Warm peach-purple gradient: the sky just after sunset.
  evening_sunny:  {
    bgDeep: '#0e0908',
    glow1:  'rgba(255,145,90,0.15)',    // warm amber-peach, top-left
    glow2:  'rgba(185,75,210,0.09)',    // soft purple, bottom-right
  },
  evening_cloudy: {
    bgDeep: '#0c090c',
    glow1:  'rgba(220,120,100,0.12)',   // muted peach
    glow2:  'rgba(155,75,185,0.07)',    // dimmer purple
  },

  // ── Night ─────────────────────────────────────────────────────────────────
  // Gentle navy: calm, deep, restful. Close to the existing default.
  night: {
    bgDeep: '#050812',
    glow1:  'rgba(100,80,205,0.08)',    // subtle violet
    glow2:  'rgba(70,60,175,0.05)',
  },
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * getBackgroundTheme({ timeOfDay, weather })
 *
 * @param {string} timeOfDay  'morning' | 'afternoon' | 'evening' | 'night'
 *                            (from getTimeOfDay(hour))
 * @param {string} weather    'sunny' | 'cloudy' | 'fog' | 'rain' | 'storm' |
 *                            'snow' | 'clear-night' | null
 *                            (from atmosphere.weather.type, or a mock value)
 * @returns {{ bgDeep:string, glow1:string, glow2:string }}
 */
export function getBackgroundTheme({ timeOfDay, weather }) {
  const isRainy  = weather === 'rain' || weather === 'storm'
  const isCloudy = weather === 'cloudy' || weather === 'fog' || weather === 'snow'
  const isSunny  = weather === 'sunny'

  const isDaytime = timeOfDay === 'morning' || timeOfDay === 'afternoon'

  let theme
  if (timeOfDay === 'morning') {
    if (isRainy)  theme = THEMES.morning_rainy
    else if (isCloudy) theme = THEMES.morning_cloudy
    else theme = THEMES.morning_sunny
  } else if (timeOfDay === 'afternoon') {
    if (isRainy)  theme = THEMES.afternoon_rainy
    else if (isCloudy) theme = THEMES.afternoon_cloudy
    else theme = THEMES.afternoon_sunny
  } else if (timeOfDay === 'evening') {
    if (isRainy)  theme = THEMES.evening_rainy
    else if (isCloudy) theme = THEMES.evening_cloudy
    else theme = THEMES.evening_sunny
  } else {
    // night (8 pm – 6 am)
    theme = isRainy ? THEMES.night_rainy : THEMES.night
  }

  return { ...theme, isDaytime }
}
