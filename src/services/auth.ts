import { supabase } from '@/lib/supabase';

/**
 * Supabase Auth requires an email. We keep a username+password UX by mapping:
 *   username  →  username@flpt.app
 * (.local is rejected by Supabase as an invalid email address.)
 */
function toAuthEmail(username: string): string {
  const clean = username.toLowerCase().trim();
  return `${clean}@flpt.app`;
}

function friendlyAuthError(error: { message?: string; status?: number }): Error {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already been registered')) {
    return new Error('That username is already taken. Please choose another.');
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

export async function signUp(username: string, password: string, displayName: string, targetLetDate?: string) {
  const cleanUsername = username.toLowerCase().trim();
  if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
    throw new Error('Username must be 3–30 characters and use only letters, numbers, and underscores.');
  }

  const email = toAuthEmail(cleanUsername);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: cleanUsername,
        display_name: (displayName || cleanUsername).trim(),
        target_let_date: targetLetDate || null,
      },
    },
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
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
