/**
 * Single persistent Audio element shared across the app.
 *
 * Created at module import time — no src, no autoplay.
 *
 * Why a singleton?
 *   iOS Safari grants audio permission per-element, not per-page.
 *   App.jsx calls play() on this element during the "开启今日的电台" user gesture.
 *   Even though the play() fails immediately (no src yet), it registers the
 *   gesture on THIS specific element.  When RadioPlayer later calls
 *   audio.src = url; audio.play() inside a useEffect, iOS honours it because
 *   the gesture link is already established on the same element.
 *
 * Do not create additional Audio() instances for music playback — use this one.
 */
const audioElement = typeof window !== 'undefined'
  ? new Audio()
  : null

if (audioElement) {
  audioElement.crossOrigin = 'anonymous'
  audioElement.preload     = 'metadata'
}

export { audioElement }
