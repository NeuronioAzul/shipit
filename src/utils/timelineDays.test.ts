import { describe, expect, it } from 'vitest'
import {
  FULL_DENSITY_MIN_TRACK_PX,
  WEEKDAY_LETTERS,
  formatShortDate,
  getActivityDays,
  getDayAtPointer,
  getTimelineDays,
} from './timelineDays'

describe('getTimelineDays', () => {
  it('returns one entry per day of the month', () => {
    expect(getTimelineDays('02/2028')).toHaveLength(29)
    expect(getTimelineDays('02/2027')).toHaveLength(28)
    expect(getTimelineDays('10/2026')).toHaveLength(31)
  })

  it('maps weekday letters and weekends (01/10/2026 is a Thursday)', () => {
    const days = getTimelineDays('10/2026')

    expect(days[0]).toMatchObject({ day: 1, weekday: 4, letter: 'Q', isWeekend: false })
    expect(days[2]).toMatchObject({ day: 3, weekday: 6, letter: 'S', isWeekend: true })
    expect(days[3]).toMatchObject({ day: 4, weekday: 0, letter: 'D', isWeekend: true })
    expect(days[2].label).toContain('sábado')
    expect(days[2].label).toContain('03/10')
  })

  it('uses the pt-BR letter sequence D S T Q Q S S', () => {
    expect([...WEEKDAY_LETTERS]).toEqual(['D', 'S', 'T', 'Q', 'Q', 'S', 'S'])
  })

  it('falls back to the current month on invalid input', () => {
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    expect(getTimelineDays('13/2026')).toHaveLength(expected)
    expect(getTimelineDays('abc')).toHaveLength(expected)
  })
})

describe('getDayAtPointer', () => {
  it('maps the pointer offset to the day under it', () => {
    expect(getDayAtPointer(0, 620, 31)).toBe(1)
    expect(getDayAtPointer(619.99, 620, 31)).toBe(31)
    expect(getDayAtPointer(310, 620, 31)).toBe(16)
    expect(getDayAtPointer(19.99, 620, 31)).toBe(1)
    expect(getDayAtPointer(20, 620, 31)).toBe(2)
  })

  it('returns null outside the track or without width', () => {
    expect(getDayAtPointer(-1, 620, 31)).toBeNull()
    expect(getDayAtPointer(620, 620, 31)).toBeNull()
    expect(getDayAtPointer(10, 0, 31)).toBeNull()
    expect(getDayAtPointer(10, 620, 0)).toBeNull()
  })
})

describe('getActivityDays', () => {
  const month = '10/2026'

  it('returns the day range inside the month', () => {
    expect(getActivityDays({ date_start: '2026-10-05', date_end: '2026-10-09' }, month)).toEqual({ start: 5, end: 9 })
    expect(getActivityDays({ date_start: '2026-10-12', date_end: '2026-10-12' }, month)).toEqual({ start: 12, end: 12 })
  })

  it('clamps ranges that cross the month boundaries', () => {
    expect(getActivityDays({ date_start: '2026-09-28', date_end: '2026-10-03' }, month)).toEqual({ start: 1, end: 3 })
    expect(getActivityDays({ date_start: '2026-10-30', date_end: '2026-11-02' }, month)).toEqual({ start: 30, end: 31 })
    expect(getActivityDays({ date_start: '2026-09-01', date_end: '2026-11-30' }, month)).toEqual({ start: 1, end: 31 })
  })

  it('returns null when the range does not touch the month', () => {
    expect(getActivityDays({ date_start: '2026-09-01', date_end: '2026-09-30' }, month)).toBeNull()
    expect(getActivityDays({ date_start: '2026-11-01', date_end: '2026-11-05' }, month)).toBeNull()
    expect(getActivityDays({ date_start: '2026-11-05', date_end: '2026-11-01' }, month)).toBeNull()
  })

  it('returns null when a date is missing or invalid', () => {
    expect(getActivityDays({ date_start: null, date_end: '2026-10-09' }, month)).toBeNull()
    expect(getActivityDays({ date_start: '2026-10-05', date_end: null }, month)).toBeNull()
    expect(getActivityDays({ date_start: 'not-a-date', date_end: '2026-10-09' }, month)).toBeNull()
  })
})

describe('formatShortDate', () => {
  it('formats as DD/MM and uses a dash for empty values', () => {
    expect(formatShortDate('2026-10-05')).toBe('05/10')
    expect(formatShortDate(null)).toBe('—')
  })
})

describe('FULL_DENSITY_MIN_TRACK_PX', () => {
  it('matches the container-query threshold used by TimelineChart', () => {
    expect(FULL_DENSITY_MIN_TRACK_PX).toBe(682)
  })
})
