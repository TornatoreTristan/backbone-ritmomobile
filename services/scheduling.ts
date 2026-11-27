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

// ---------------------------------------------------------------------------
// RDV : affichage et saisie manuelle (heure de Paris, comme les créneaux)
// ---------------------------------------------------------------------------

const PARIS_TIME_ZONE = 'Europe/Paris';

type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

/** Date et heure « murales » à Paris d'un instant donné. */
function parisWallClock(date: Date): WallClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function wallClockAsUtc(w: WallClock): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * RDV affiché au récapitulatif : « mer. 10/06/2026 à 09:00 » (heure de Paris).
 * Renvoie `null` si la valeur n'est pas une date lisible.
 */
export function formatRdvDateTime(iso: string): string | null {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  try {
    const w = parisWallClock(date);
    const dow = new Date(Date.UTC(w.year, w.month - 1, w.day)).getUTCDay();
    return `${DAY_ABBR[dow]}. ${pad2(w.day)}/${pad2(w.month)}/${w.year} à ${pad2(w.hour)}:${pad2(w.minute)}`;
  } catch {
    return null;
  }
}

/** Valeur du champ de saisie manuelle pour un RDV existant : « 10/06/2026 09:00 ». */
export function formatManualRdv(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  try {
    const w = parisWallClock(date);
    return `${pad2(w.day)}/${pad2(w.month)}/${w.year} ${pad2(w.hour)}:${pad2(w.minute)}`;
  } catch {
    return '';
  }
}

const MANUAL_RDV_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(?:à\s+)?(\d{1,2})[:hH](\d{2})$/;

export type ManualRdvResult = { iso: string } | { error: string };

/**
 * Lit une saisie manuelle « JJ/MM/AAAA HH:MM » (heure de Paris) et la convertit
 * en instant ISO 8601 UTC, sans ambiguïté de fuseau côté serveur. Refuse les
 * dates inexistantes (31/02) et les dates passées.
 */
export function parseManualRdv(input: string, now: Date = new Date()): ManualRdvResult {
  const match = input.trim().match(MANUAL_RDV_PATTERN);
  if (!match) {
    return { error: 'Format attendu : JJ/MM/AAAA HH:MM (ex. 10/06/2026 09:00).' };
  }
  const wanted: WallClock = {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  if (wanted.month < 1 || wanted.month > 12 || wanted.hour > 23 || wanted.minute > 59) {
    return { error: 'Date ou heure inexistante.' };
  }

  // L'heure murale de Paris est d'abord lue comme de l'UTC, puis corrigée du
  // décalage de Paris à cet instant (deux passes pour les changements d'heure).
  const wantedAsUtc = wallClockAsUtc(wanted);
  // `Date.UTC` reporte un jour inexistant sur le mois suivant (31/02 → 03/03).
  if (new Date(wantedAsUtc).getUTCDate() !== wanted.day) {
    return { error: 'Date ou heure inexistante.' };
  }
  let instant = wantedAsUtc;
  try {
    for (let i = 0; i < 2; i++) {
      instant -= wallClockAsUtc(parisWallClock(new Date(instant))) - wantedAsUtc;
    }
    // Une heure sautée au passage à l'heure d'été ne se relit pas à l'identique.
    if (isNaN(instant) || wallClockAsUtc(parisWallClock(new Date(instant))) !== wantedAsUtc) {
      return { error: 'Date ou heure inexistante.' };
    }
  } catch {
    return { error: 'Date illisible sur cet appareil. Choisissez un créneau dans la grille.' };
  }
  const result = new Date(instant);
  if (instant <= now.getTime()) {
    return { error: 'La date du rendez-vous doit être dans le futur.' };
  }
  return { iso: result.toISOString() };
}
