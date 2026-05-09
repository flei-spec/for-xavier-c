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

  // ── Daytime · sunny ──────────────────────────────────────────────────────
  // Soft white-blue sky feeling: gentle azure glow from above.
  morning_sunny: {
    bgDeep: '#0a0c14',
    glow1:  'rgba(190,220,255,0.14)',   // pale sky-blue, top-left
    glow2:  'rgba(220,200,140,0.08)',   // warm sunrise gold, bottom-right
  },
  afternoon_sunny: {
    bgDeep: '#090c14',
    glow1:  'rgba(180,215,255,0.13)',   // clear sky-blue
    glow2:  'rgba(160,195,250,0.07)',
  },

  // ── Daytime · cloudy ─────────────────────────────────────────────────────
  // Pale blue-gray: muted, overcast, gentle.
  morning_cloudy: {
    bgDeep: '#09090f',
    glow1:  'rgba(150,165,210,0.10)',   // cool gray-blue
    glow2:  'rgba(120,140,195,0.06)',
  },
  afternoon_cloudy: {
    bgDeep: '#08090e',
    glow1:  'rgba(135,150,200,0.09)',
    glow2:  'rgba(110,130,185,0.05)',
  },

  // ── Any time · rainy / stormy ────────────────────────────────────────────
  // Muted gray-blue: heavy, damp, introspective.
  morning_rainy: {
    bgDeep: '#070a11',
    glow1:  'rgba(80,115,210,0.13)',    // deep sky-blue
    glow2:  'rgba(60,90,185,0.07)',
  },
  afternoon_rainy: {
    bgDeep: '#060910',
    glow1:  'rgba(70,110,210,0.14)',
    glow2:  'rgba(55,85,190,0.08)',
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

  if (timeOfDay === 'morning') {
    if (isRainy)  return THEMES.morning_rainy
    if (isCloudy) return THEMES.morning_cloudy
    if (isSunny)  return THEMES.morning_sunny
    return THEMES.morning_cloudy          // default: assume overcast
  }

  if (timeOfDay === 'afternoon') {
    if (isRainy)  return THEMES.afternoon_rainy
    if (isCloudy) return THEMES.afternoon_cloudy
    if (isSunny)  return THEMES.afternoon_sunny
    return THEMES.afternoon_cloudy
  }

  if (timeOfDay === 'evening') {
    if (isRainy)  return THEMES.evening_rainy
    if (isCloudy) return THEMES.evening_cloudy
    return THEMES.evening_sunny           // sunny + overcast → same warm sunset
  }

  // night (8 pm – 6 am)
  if (isRainy) return THEMES.night_rainy
  return THEMES.night
}
