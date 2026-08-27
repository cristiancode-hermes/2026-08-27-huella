export const TOKEN_KEY = 'huella_token';
export const API = '/api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'tutor' | 'staff' | 'admin';
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface PlayGroup {
  id: string;
  slug: string;
  name: string;
  size: 'S' | 'M' | 'L';
  capacity: number;
  priceCents: number;
  description: string;
  photoUrl: string;
  freeSlotsToday: number;
  occupancyLabel: string;
}

export interface Slot {
  id: string;
  playGroupId: string;
  kind: 'drop_off' | 'pick_up';
  startTime: string;
  label: string;
}

export interface Dog {
  id: string;
  userId: string;
  name: string;
  size: 'S' | 'M' | 'L';
  vaccines: { rabiesUntil: string; polyvalentUntil: string };
  temperament: string;
  photoUrl: string | null;
  ready: boolean;
}

export interface Addon {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
}

export interface BookingLine {
  id: string;
  kind: string;
  label: string;
  qty: number;
  unitCents: number;
  subtotalCents: number;
}

export interface Booking {
  id: string;
  userId: string;
  dogId: string;
  playGroupId: string;
  visitDate: string;
  status: string;
  expiresAt: string | null;
  code: string;
  qrSvg: string | null;
  qrUrl: string | null;
  totalCents: number;
  lines?: BookingLine[];
  dog?: Dog;
  playGroup?: PlayGroup;
  dropOffSlot?: Slot;
  pickUpSlot?: Slot;
}

export interface OccupancyPoint {
  date: string;
  groupId: string;
  groupName: string;
  occupied: number;
  capacity: number;
}

export const CONFLICT: Record<string, string> = {
  GROUP_FULL: 'Esta manada está completa ese día. Elige otra fecha o grupo.',
  YARD_CLOSED: 'El patio no abre ese día.',
  ALREADY_HELD: 'Ya tienes una retención viva para este perro.',
  ALREADY_BOOKED: 'Este perro ya tiene visita ese día.',
  DOG_NOT_READY: 'Faltan vacunas en vigor. Actualiza la ficha.',
  SIZE_MISMATCH: 'La talla del perro no encaja en esta manada.',
  SLOT_TAKEN: 'Esa ventana ya no está disponible.',
  HOLD_EXPIRED: 'La retención caducó. Empieza de nuevo.',
  ALREADY_CHECKED_IN: 'Esta visita ya está en el patio.',
  PICKUP_DENIED: 'Este pase no autoriza la recogida.',
  CANCEL_WINDOW: 'Faltan menos de 24 h. No se puede cancelar.',
  NOT_CONFIRMABLE: 'Esta visita no se puede confirmar.',
  DOG_ACTIVE: 'Este perro tiene una visita activa.',
};

export function humanConflict(err: any): string {
  const body = err?.error ?? err;
  const code = body?.code || (typeof body?.message === 'string' && body.message.includes(':')
    ? body.message.split(':')[0]
    : '');
  if (code && CONFLICT[code]) return CONFLICT[code];
  if (typeof body?.message === 'string') {
    const stripped = body.message.replace(/^[A-Z_]+:\s*/, '');
    return stripped || 'No se pudo completar.';
  }
  return 'No se pudo completar.';
}

export function euros(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}
