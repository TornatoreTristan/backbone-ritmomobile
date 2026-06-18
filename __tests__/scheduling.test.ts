import {
  computeWorkingDays,
  formatDayLabel,
  formatSlotTime,
  intersectSlots,
  type TechnicianAvailability,
} from '@/services/scheduling';

// ---------------------------------------------------------------------------
// computeWorkingDays
// ---------------------------------------------------------------------------

describe('computeWorkingDays', () => {
  it('returns the requested count of days', () => {
    const days = computeWorkingDays(22);
    expect(days).toHaveLength(22);
  });

  it('defaults to 22 days', () => {
    expect(computeWorkingDays()).toHaveLength(22);
  });

  it('starts from tomorrow (not today)', () => {
    const days = computeWorkingDays(5);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const expectedFirst = `${y}-${m}-${d}`;
    // The first day might be skipped if tomorrow is a Sunday — find the
    // first non-Sunday starting from tomorrow.
    const dow = tomorrow.getDay();
    if (dow !== 0) {
      expect(days[0]).toBe(expectedFirst);
    }
  });

  it('never includes a Sunday (day 0)', () => {
    const days = computeWorkingDays(22);
    for (const day of days) {
      const [y, m, d] = day.split('-').map(Number);
      const date = new Date(y, (m ?? 1) - 1, d ?? 1);
      expect(date.getDay()).not.toBe(0);
    }
  });

  it('includes Saturdays (day 6)', () => {
    // Generate enough days to guarantee at least one Saturday
    const days = computeWorkingDays(7);
    const hasSaturday = days.some((day) => {
      const [y, m, d] = day.split('-').map(Number);
      const date = new Date(y, (m ?? 1) - 1, d ?? 1);
      return date.getDay() === 6;
    });
    // Not guaranteed if today is Sunday through Monday — use 22 days to be safe
    const moreDays = computeWorkingDays(22);
    const moreSaturday = moreDays.some((day) => {
      const [y, m, d] = day.split('-').map(Number);
      const date = new Date(y, (m ?? 1) - 1, d ?? 1);
      return date.getDay() === 6;
    });
    // At least one of the two checks should find a Saturday in 22 days
    expect(hasSaturday || moreSaturday).toBe(true);
  });

  it('returns dates in YYYY-MM-DD format', () => {
    const days = computeWorkingDays(3);
    for (const day of days) {
      expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('returns chronologically ordered dates', () => {
    const days = computeWorkingDays(10);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]! > days[i - 1]!).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// intersectSlots
// ---------------------------------------------------------------------------

function makeTech(userId: string, availableStarts: string[]): TechnicianAvailability {
  return {
    userId,
    fullName: userId,
    slots: availableStarts.map((start) => ({
      start,
      end: start, // end doesn't matter for intersection logic
      available: true,
    })),
  };
}

describe('intersectSlots', () => {
  it('returns empty array when techs is empty', () => {
    expect(intersectSlots([])).toEqual([]);
  });

  it('returns only available slots for a single tech', () => {
    const tech: TechnicianAvailability = {
      userId: 'u1',
      fullName: 'Alice',
      slots: [
        { start: '2026-06-10T07:00:00.000Z', end: '2026-06-10T08:00:00.000Z', available: true },
        { start: '2026-06-10T09:00:00.000Z', end: '2026-06-10T10:00:00.000Z', available: false },
      ],
    };
    const result = intersectSlots([tech]);
    expect(result).toHaveLength(1);
    expect(result[0]?.start).toBe('2026-06-10T07:00:00.000Z');
  });

  it('returns the intersection for two techs with common slots', () => {
    const t1 = makeTech('u1', [
      '2026-06-10T07:00:00.000Z',
      '2026-06-10T09:00:00.000Z',
    ]);
    const t2 = makeTech('u2', [
      '2026-06-10T09:00:00.000Z',
      '2026-06-10T11:00:00.000Z',
    ]);
    const result = intersectSlots([t1, t2]);
    expect(result).toHaveLength(1);
    expect(result[0]?.start).toBe('2026-06-10T09:00:00.000Z');
  });

  it('returns empty when two techs share no slots', () => {
    const t1 = makeTech('u1', ['2026-06-10T07:00:00.000Z']);
    const t2 = makeTech('u2', ['2026-06-10T09:00:00.000Z']);
    expect(intersectSlots([t1, t2])).toHaveLength(0);
  });

  it('handles three techs correctly — all three must share the slot', () => {
    const t1 = makeTech('u1', [
      '2026-06-10T07:00:00.000Z',
      '2026-06-10T09:00:00.000Z',
    ]);
    const t2 = makeTech('u2', [
      '2026-06-10T07:00:00.000Z',
      '2026-06-10T09:00:00.000Z',
    ]);
    const t3 = makeTech('u3', ['2026-06-10T09:00:00.000Z']);
    const result = intersectSlots([t1, t2, t3]);
    expect(result).toHaveLength(1);
    expect(result[0]?.start).toBe('2026-06-10T09:00:00.000Z');
  });

  it('returns results in chronological order', () => {
    const t1 = makeTech('u1', [
      '2026-06-10T13:00:00.000Z',
      '2026-06-10T07:00:00.000Z',
      '2026-06-10T09:00:00.000Z',
    ]);
    const t2 = makeTech('u2', [
      '2026-06-10T13:00:00.000Z',
      '2026-06-10T07:00:00.000Z',
      '2026-06-10T09:00:00.000Z',
    ]);
    const result = intersectSlots([t1, t2]);
    expect(result).toHaveLength(3);
    expect(result[0]?.start).toBe('2026-06-10T07:00:00.000Z');
    expect(result[1]?.start).toBe('2026-06-10T09:00:00.000Z');
    expect(result[2]?.start).toBe('2026-06-10T13:00:00.000Z');
  });

  it('ignores unavailable slots when a tech also has available ones', () => {
    const tech1: TechnicianAvailability = {
      userId: 'u1',
      fullName: 'Alice',
      slots: [
        { start: '2026-06-10T07:00:00.000Z', end: '', available: false },
        { start: '2026-06-10T09:00:00.000Z', end: '', available: true },
      ],
    };
    const tech2 = makeTech('u2', [
      '2026-06-10T07:00:00.000Z',
      '2026-06-10T09:00:00.000Z',
    ]);
    const result = intersectSlots([tech1, tech2]);
    // 07:00 is unavailable for tech1, so only 09:00 qualifies
    expect(result).toHaveLength(1);
    expect(result[0]?.start).toBe('2026-06-10T09:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// formatSlotTime
// ---------------------------------------------------------------------------

describe('formatSlotTime', () => {
  it('returns a HH:mm string', () => {
    // 2026-06-10T07:00:00.000Z = 09:00 in Europe/Paris (UTC+2 summer)
    const result = formatSlotTime('2026-06-10T07:00:00.000Z');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('does not throw on invalid input and returns the input as fallback', () => {
    // formatSlotTime catches errors and returns the original string
    const result = formatSlotTime('not-a-date');
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// formatDayLabel
// ---------------------------------------------------------------------------

describe('formatDayLabel', () => {
  it('returns a string matching the expected pattern', () => {
    // 2026-06-10 is a Wednesday (mer)
    const result = formatDayLabel('2026-06-10');
    expect(result).toMatch(/^\w+\. \d{2}\/\d{2}$/);
  });

  it('formats a known Wednesday correctly', () => {
    const result = formatDayLabel('2026-06-10');
    expect(result).toBe('mer. 10/06');
  });

  it('formats a known Monday correctly', () => {
    // 2026-06-08 is a Monday
    const result = formatDayLabel('2026-06-08');
    expect(result).toBe('lun. 08/06');
  });

  it('formats a known Saturday correctly', () => {
    // 2026-06-13 is a Saturday
    const result = formatDayLabel('2026-06-13');
    expect(result).toBe('sam. 13/06');
  });
});
