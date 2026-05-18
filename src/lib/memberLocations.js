import { supabase } from './supabase'

// ── Session guard ─────────────────────────────────────────────────────────────
// Location is captured at most once per browser session (per tab).
// If the user denies permission, we store 'denied' so we don't keep asking.
const SESSION_KEY = 'xr_loc_captured'

// ── Haversine distance ────────────────────────────────────────────────────────

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R      = 6371
  const toRad  = (d) => d * Math.PI / 180
  const dLat   = toRad(lat2 - lat1)
  const dLon   = toRad(lon2 - lon1)
  const a      =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function formatDistanceKm(km) {
  if (km < 0.1) return '不到 1 公里'
  if (km < 1)   return `${km.toFixed(1)} 公里`
  return `${Math.round(km).toLocaleString()} 公里`
}

// ── Reverse geocode ───────────────────────────────────────────────────────────
// Uses OpenStreetMap Nominatim — free, no API key, city-level zoom only.
// Returns Chinese city name if available, falls back to whatever Nominatim has.

async function reverseGeocode(lat, lon) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lon}&format=json&accept-language=zh-CN&zoom=10`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address ?? {}
    // city > town > village > county > state — most specific non-null locality
    const raw = addr.city || addr.town || addr.village || addr.county || addr.state || null
    if (!raw) return null
    // Strip common Chinese admin suffixes: 上海市→上海, 黄浦区→黄浦
    return raw.replace(/[市区县镇村]$/, '')
  } catch {
    return null
  }
}

// ── Supabase read / write ────────────────────────────────────────────────────

export async function fetchSpaceLocations(spaceId) {
  const { data, error } = await supabase
    .from('member_locations')
    .select('user_id, city, latitude, longitude, updated_at')
    .eq('space_id', spaceId)
  if (error) {
    console.error('[memberLocations] fetch error:', error.message)
    return []
  }
  return data ?? []
}

async function saveLocation({ userId, spaceId, city, latitude, longitude }) {
  const { error } = await supabase
    .from('member_locations')
    .upsert(
      {
        user_id:    userId,
        space_id:   spaceId,
        city:       city ?? null,
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,space_id' }
    )
  if (error) console.error('[memberLocations] save error:', error.message)
  return !error
}

// ── Location capture (called once per session) ────────────────────────────────

export async function captureLocation(userId, spaceId) {
  // Skip if already handled this tab session
  if (sessionStorage.getItem(SESSION_KEY)) return false

  // Check if the browser has permanently denied geolocation
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' })
    if (perm?.state === 'denied') {
      sessionStorage.setItem(SESSION_KEY, 'denied')
      return false
    }
  } catch { /* Permissions API not available — proceed anyway */ }

  if (!navigator?.geolocation) {
    sessionStorage.setItem(SESSION_KEY, 'unavailable')
    return false
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        const city = await reverseGeocode(latitude, longitude)
        const saved = await saveLocation({ userId, spaceId, city, latitude, longitude })
        sessionStorage.setItem(SESSION_KEY, saved ? 'ok' : 'save_failed')
        resolve(saved)
      },
      (err) => {
        console.log('[memberLocations] geolocation error:', err.message)
        sessionStorage.setItem(SESSION_KEY, 'denied')
        resolve(false)
      },
      { timeout: 8000, maximumAge: 3_600_000 } // accept a position cached ≤ 1 h
    )
  })
}
