import { supabase } from '@/lib/supabase';

/**
 * Supabase Auth requires an email identity. FLPT never shows email to the user.
 * Mapping (stable, one-way for the user):
 *   username  →  username@flpt.app
 *
 * Account creation uses the `create-account` Edge Function (service role) with
 * email_confirm: true so NO confirmation email is sent and rate limits are not hit.
 * Login uses the same mapping via signInWithPassword.
 */

function toAuthEmail(username: string): string {
  return `${username.toLowerCase().trim()}@flpt.app`;
}

function friendlyAuthError(error: { message?: string; status?: number }): Error {
  const msg = (error.message || '').toLowerCase();
  if (
    msg.includes('already registered') ||
    msg.includes('user already exists') ||
    msg.includes('already been registered') ||
    msg.includes('already taken')
  ) {
    return new Error('That username is already taken. Please choose another.');
  }
  if (msg.includes('rate') || msg.includes('email rate') || msg.includes('over_email_send_rate_limit')) {
    return new Error('Too many account attempts from this network. Please wait a few minutes, then try once.');
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return new Error('Invalid username or password.');
  }
  if (msg.includes('email address') && msg.includes('invalid')) {
    return new Error('Username contains invalid characters. Use letters, numbers, and underscores only.');
  }
  if (msg.includes('password')) {
    return new Error(error.message || 'Password does not meet requirements.');
  }
  return new Error(error.message || 'Authentication failed.');
}

export async function signUp(
  username: string,
  password: string,
  displayName: string,
  targetLetDate?: string
) {
  const cleanUsername = username.toLowerCase().trim();
  if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
    throw new Error('Username must be 3–30 characters and use only letters, numbers, and underscores.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('App is not configured. Missing Supabase environment variables.');
  }

  // Create account via Edge Function (no confirmation email)
  const res = await fetch(`${supabaseUrl}/functions/v1/create-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      username: cleanUsername,
      password,
      display_name: (displayName || cleanUsername).trim(),
      target_let_date: targetLetDate || null,
    }),
  });

  let payload: { error?: string; ok?: boolean } = {};
  try {
    payload = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw friendlyAuthError({ message: payload.error || `Signup failed (${res.status})` });
  }

  // Sign in immediately with the same identity mapping (no second signup call)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(cleanUsername),
    password,
  });

  if (error) throw friendlyAuthError(error);
  return data;
}

export async function signIn(username: string, password: string) {
  const email = toAuthEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw friendlyAuthError(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Password recovery still goes through Supabase email for the synthetic identity.
 * Without a real mailbox this is limited; prefer in-app password change when logged in.
 */
export async function resetPassword(username: string) {
  const email = toAuthEmail(username);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw friendlyAuthError(error);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw friendlyAuthError(error);
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
