'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div style={container}>
        <h2 style={heading}>Invalid link</h2>
        <p style={sub}>This password reset link is invalid. Please request a new one from the app.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div style={container}>
        <h2 style={{ ...heading, color: '#059669' }}>Password updated!</h2>
        <p style={sub}>Your password has been reset. You can now sign in with your new password in the CalDoc app.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/patient/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed. Please try again.'); return; }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={container}>
      <div style={logo}>C</div>
      <h2 style={heading}>Set new password</h2>
      <p style={sub}>Enter your new password below.</p>
      <form onSubmit={handleSubmit} style={form}>
        <input
          type="password"
          placeholder="New password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
          required
          minLength={8}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={input}
          required
          disabled={loading}
        />
        {error && <p style={errorStyle}>{error}</p>}
        <button type="submit" disabled={loading} style={btn}>
          {loading ? 'Updating…' : 'Set new password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={container}><p style={sub}>Loading…</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

const container: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '24px', backgroundColor: '#f7f2ea', fontFamily: 'sans-serif',
};
const logo: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 14,
  backgroundColor: '#2f6ea5', color: '#fff',
  fontSize: 28, fontWeight: 700, fontStyle: 'italic',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: 16,
};
const heading: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: '#1e3a52', margin: '0 0 8px' };
const sub: React.CSSProperties = { color: '#475569', fontSize: 15, textAlign: 'center', marginBottom: 24, maxWidth: 400 };
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 };
const input: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 10, border: '1.5px solid #E2E8F0',
  fontSize: 15, color: '#0F172A', outline: 'none', backgroundColor: '#fff',
};
const btn: React.CSSProperties = {
  padding: '14px', borderRadius: 10, border: 'none',
  backgroundColor: '#2f6ea5', color: '#fff', fontSize: 15,
  fontWeight: 700, cursor: 'pointer',
};
const errorStyle: React.CSSProperties = { color: '#EF4444', fontSize: 13, margin: 0 };
