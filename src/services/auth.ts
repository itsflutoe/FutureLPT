import { supabase } from '@/lib/supabase';

/**
 * Username-only UX. Supabase still needs an email identity:
 *   username → username@flpt.app
 *
 * Preferred path: Edge Function `create-account` (email_confirm: true, no email sent).
 * Fallback path: client signUp — only works without rate-limit / confirmation emails
 * when Supabase "Confirm email" is disabled in the project Auth settings.
 */

function toAuthEmail(username: string): string {
  return `${username.toLowerCase().trim()}@flpt.app`;
}

function cleanUsername(username: string): string {
  return username.toLowerCase().trim();
}

function friendlyAuthError(error: { message?: string; status?: number; code?: string }): Error {
  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  if (
    msg.includes('already registered') ||
    msg.includes('user already exists') ||
    msg.includes('already been registered') ||
    msg.includes('already taken') ||
    code === 'user_already_exists'
  ) {
    return new Error('That username is already taken. Please choose another.');
  }
  if (
    msg.includes('rate') ||
    msg.includes('email rate') ||
    msg.includes('over_email_send_rate_limit') ||
    code === 'over_email_send_rate_limit'
  ) {
    return new Error(
      'Email confirmation is enabled on this Supabase project, so signup is blocked by email limits. ' +
        'In Supabase Dashboard → Authentication → Providers → Email, turn OFF “Confirm email”, ' +
        'or deploy the create-account Edge Function. Then try once with a new username.'
    );
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || code === 'invalid_credentials') {
    return new Error('Invalid username or password.');
  }
  if (msg.includes('email not confirmed') || code === 'email_not_confirmed') {
    return new Error(
      'This account is waiting for email confirmation. Turn OFF “Confirm email” in Supabase Auth settings, ' +
        'or create the account via the create-account Edge Function.'
    );
  }
  if (msg.includes('email address') && msg.includes('invalid')) {
    return new Error('Username contains invalid characters. Use letters, numbers, and underscores only.');
  }
  if (msg.includes('password')) {
    return new Error(error.message || 'Password does not meet requirements.');
  }
  return new Error(error.message || 'Authentication failed.');
}

async function createViaEdgeFunction(
  username: string,
  password: string,
  displayName: string,
  targetLetDate?: string | null
): Promise<'ok' | 'not_deployed' | 'error'> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return 'error';

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        username,
        password,
        display_name: displayName,
        target_let_date: targetLetDate || null,
      }),
    });
  } catch {
    return 'not_deployed';
  }

  // Function not deployed or routing missing
  if (res.status === 404 || res.status === 405) {
    return 'not_deployed';
  }

  let payload: { error?: string; ok?: boolean } = {};
  try {
    payload = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw friendlyAuthError({ message: payload.error || `Signup failed (${res.status})` });
  }

  return 'ok';
}

async function createViaClientSignUp(
  username: string,
  password: string,
  displayName: string,
  targetLetDate?: string | null
) {
  const email = toAuthEmail(username);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
        target_let_date: targetLetDate || null,
      },
    },
  });

  if (error) throw friendlyAuthError(error);

  // If Confirm email is ON, session is null and an email was (or tried to be) sent
  if (!data.session) {
    throw new Error(
      'Account was created but not signed in because “Confirm email” is enabled in Supabase. ' +
        'Turn OFF Authentication → Providers → Email → Confirm email (recommended for username-only apps), ' +
        'or deploy the create-account Edge Function so accounts are confirmed without email.'
    );
  }

  return data;
}

export async function signUp(
  username: string,
  password: string,
  displayName: string,
  targetLetDate?: string
) {
  const usernameClean = cleanUsername(username);
  if (!/^[a-z0-9_]{3,30}$/.test(usernameClean)) {
    throw new Error('Username must be 3–30 characters and use only letters, numbers, and underscores.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const name = (displayName || usernameClean).trim();

  // 1) Prefer Edge Function (no confirmation email, works even if Confirm email is ON)
  const edgeResult = await createViaEdgeFunction(usernameClean, password, name, targetLetDate);

  if (edgeResult === 'ok') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: toAuthEmail(usernameClean),
      password,
    });
    if (error) throw friendlyAuthError(error);
    return data;
  }

  // 2) Fallback: client signUp (requires Confirm email OFF to avoid rate limits / no session)
  return createViaClientSignUp(usernameClean, password, name, targetLetDate);
}

export async function signIn(username: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(username),
    password,
  });
  if (error) throw friendlyAuthError(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** @deprecated Email recovery is not used. See ForgotPassword page (admin-mediated recovery). */
export async function resetPassword(_username: string) {
  throw new Error(
    'Password recovery is handled by the FLPT administrator. Use Forgot Password for instructions.'
  );
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
