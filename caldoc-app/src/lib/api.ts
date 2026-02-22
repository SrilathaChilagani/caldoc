import { API_BASE } from '../config/env';
import { getToken } from './auth';

// ── Types ──────────────────────────────────────────────────────────────

export type Appointment = {
  id: string;
  status: string;
  provider: { name: string };
  slot: { startsAt: string } | null;
  createdAt: string;
};

export type LabTest = { name: string; qty?: number };

export type LabOrder = {
  id: string;
  status: string;
  tests: LabTest[] | string[] | null;
  amountPaise: number | null;
  createdAt: string;
  notes: string | null;
};

export type RxItem = { name: string; qty?: number };

export type RxOrder = {
  id: string;
  status: string;
  items: RxItem[] | null;
  amountPaise: number;
  createdAt: string;
  notes: string | null;
};

export type PatientProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────

async function authedGet<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401) throw new Error('session_expired');
  if (!res.ok) throw new Error('request_failed');
  return res.json() as Promise<T>;
}

/** Normalise a tests JSON field to a display-friendly string array. */
export function labTestNames(tests: LabOrder['tests']): string[] {
  if (!tests) return [];
  return (tests as Array<string | LabTest>).map((t) =>
    typeof t === 'string' ? t : t.name
  );
}

/** Normalise an items JSON field to a display-friendly string array. */
export function rxItemNames(items: RxOrder['items']): string[] {
  if (!items) return [];
  return (items as Array<string | RxItem>).map((i) =>
    typeof i === 'string' ? i : `${i.name}${i.qty ? ` ×${i.qty}` : ''}`
  );
}

/** Format paise to ₹ string. */
export function formatAmount(paise: number | null): string {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ── API calls ──────────────────────────────────────────────────────────

export function fetchAppointments() {
  return authedGet<{ appointments: Appointment[] }>('/api/patient/appointments');
}

export function fetchLabOrders() {
  return authedGet<{ orders: LabOrder[] }>('/api/patient/lab-orders');
}

export function fetchRxOrders() {
  return authedGet<{ orders: RxOrder[] }>('/api/patient/rx-orders');
}

export function fetchProfile() {
  return authedGet<{ patient: PatientProfile }>('/api/patient/me');
}
