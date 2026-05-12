// Shared Asia/Shanghai timezone for ALL relationship countdowns.
// Both partners see the same "today" regardless of their browser timezone.

const TZ = 'Asia/Shanghai'

/** Today's date in Asia/Shanghai as YYYY-MM-DD. */
export function shanghaiTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Parse a YYYY-MM-DD date string (interpreted as Shanghai midnight) to a UTC
 *  timestamp. Date.UTC is used so the value is stable across browser timezones.
 *  The absolute UTC value is off by 8 hours, but the offset cancels when
 *  subtracting two dates — only the day delta matters. */
export function shanghaiMidnightUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Exclusive day count between two Shanghai dates (end - start).
 *  Returns completed calendar days.  0 when the dates are the same. */
export function daysBetween(startStr, endStr) {
  return Math.floor(
    (shanghaiMidnightUTC(endStr) - shanghaiMidnightUTC(startStr)) /
      (1000 * 60 * 60 * 24),
  )
}

/** Current year in Asia/Shanghai — for dropdown year ranges. */
export function shanghaiYear() {
  return Number(
    new Date().toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric' }),
  )
}
