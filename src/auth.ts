import { supabase } from '@/lib/supabase';

export async function signUp(username: string, password: string, displayName: string, targetLetDate?: string) {
  // Supabase Auth uses email; we synthesize a local email from username for username+password flow
  const email = `${username.toLowerCase().trim()}@flpt.local`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase().trim(),
        display_name: displayName.trim(),
        target_let_date: targetLetDate || null,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(username: string, password: string) {
  const email = `${username.toLowerCase().trim()}@flpt.local`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(username: string) {
  const email = `${username.toLowerCase().trim()}@flpt.local`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
