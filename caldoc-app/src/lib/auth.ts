import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../config/env';

const TOKEN_KEY = 'caldoc-token';

async function request<T>(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      // noop
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function login(phone: string, otp: string) {
  const payload = await request<{ token: string }>('/api/patient/login', { phone, otp });
  await SecureStore.setItemAsync(TOKEN_KEY, payload.token);
  return payload;
}

export function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function logout() {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}
