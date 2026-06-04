import { apiRequest } from '@/services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvailabilitySlot = {
  start: string;
  end: string;
  available: boolean;
};

export type TechnicianAvailability = {
  userId: string;
  fullName: string;
  slots: AvailabilitySlot[];
};

export type AvailabilityByDate = Record<string, TechnicianAvailability[]>;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

type AvailabilityBatchBody = {
  dates: string[];
  diagnostiqueurIds: string[];
  durationMinutes: number;
};

type AvailabilityBatchResponse = {
  success: boolean;
  data: {
    availabilityByDate: AvailabilityByDate;
    busyEvents: unknown;
  };
};

export async function fetchAvailabilityBatch(
  orgId: string,
  dates: string[],
  userIds: string[],
  durationMinutes: number,
): Promise<AvailabilityByDate> {
  const body: AvailabilityBatchBody = {
    dates,
    diagnostiqueurIds: userIds,
    durationMinutes,
  };
  const response = await apiRequest<AvailabilityBatchResponse>(
    `/api/v1/organizations/${orgId}/folders/availability-batch`,
    { method: 'POST', body },
  );
  return response.data.availabilityByDate;
}

// ---------------------------------------------------------------------------
// Working days
// ---------------------------------------------------------------------------

/**
 * Returns `count` working day strings (YYYY-MM-DD) starting from tomorrow,
 * excluding Sundays (0). Saturdays are included.
 */
export function computeWorkingDays(count = 22): string[] {
  const days: string[] = [];
  const cursor = new Date();
  // Start from tomorrow
  cursor.setDate(cursor.getDate() + 1);
  cursor.setHours(0, 0, 0, 0);

  while (days.length < count) {
    const dow = cursor.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0) {
      // Format as YYYY-MM-DD in local time
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

// ---------------------------------------------------------------------------
// Slot intersection
// ---------------------------------------------------------------------------

/**
 * Returns the intersection of available slots across all technicians.
 * - Empty array of techs → returns [].
 * - Single tech → returns their available slots.
 * - Multiple techs → a slot (identified by its `start`) is included only if
 *   ALL techs have that slot with available=true.
 * Result is sorted chronologically by start.
 */
export function intersectSlots(techs: TechnicianAvailability[]): AvailabilitySlot[] {
  if (techs.length === 0) return [];

  if (techs.length === 1) {
    return techs[0].slots
      .filter((s) => s.available)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  // Build a map of start → slot for each tech's available slots
  const maps = techs.map((tech) => {
    const m = new Map<string, AvailabilitySlot>();
    for (const slot of tech.slots) {
      if (slot.available) {
        m.set(slot.start, slot);
      }
    }
    return m;
  });

  // Collect starts present in ALL techs
  const [first, ...rest] = maps;
  const commonStarts: string[] = [];
  for (const start of first.keys()) {
    if (rest.every((m) => m.has(start))) {
      commonStarts.push(start);
    }
  }

  // Sort and return slots from first tech (start/end identical by contract)
  commonStarts.sort((a, b) => a.localeCompare(b));
  return commonStarts.map((start) => first.get(start)!);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Formats an ISO datetime string to "HH:mm" in Europe/Paris timezone.
 */
export function formatSlotTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// Day abbreviations in French (Mon=1 → Sat=6)
const DAY_ABBR = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

/**
 * Formats a YYYY-MM-DD date string to "lun. 10/06".
 * Parses the date as local time to avoid timezone offsets.
 */
export function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const dow = date.getDay();
  const abbr = DAY_ABBR[dow] ?? '???';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${abbr}. ${dd}/${mm}`;
}
