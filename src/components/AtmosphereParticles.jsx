import './AtmosphereParticles.css'

function seeded(seed, max) { return ((seed * 9301 + 49297) % 233280) / 233280 * max }

export default function AtmosphereParticles({ theme }) {
  // Night/cold: no DOM particles — handled by CSS background vars alone
  if (!theme || theme === 'default' || theme === 'sunny' || theme === 'hot'
             || theme === 'deepnight' || theme === 'cold') return null

  if (theme === 'rain') {
    return (
      <div className="ap ap--rain" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="ap__raindrop"
            style={{
              left:              `${seeded(i * 3 + 1, 100)}%`,
              animationDelay:    `${seeded(i * 7 + 2, 3).toFixed(2)}s`,
              animationDuration: `${(seeded(i * 5 + 3, 0.6) + 0.8).toFixed(2)}s`,
              opacity:            (seeded(i * 11 + 4, 0.14) + 0.05).toFixed(2),
            }}
          />
        ))}
      </div>
    )
  }

  if (theme === 'snow') {
    return (
      <div className="ap ap--snow" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="ap__snowflake"
            style={{
              left:              `${seeded(i * 4 + 1, 100)}%`,
              animationDelay:    `${seeded(i * 6 + 3, 8).toFixed(2)}s`,
              animationDuration: `${(seeded(i * 3 + 2, 5) + 8).toFixed(2)}s`,
              fontSize:          `${(seeded(i * 7 + 5, 8) + 9).toFixed(0)}px`,
              opacity:            (seeded(i * 9 + 6, 0.25) + 0.08).toFixed(2),
            }}
          >
            ❄
          </div>
        ))}
      </div>
    )
  }

  return null
}
