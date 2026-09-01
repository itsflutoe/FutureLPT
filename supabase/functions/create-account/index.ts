// Supabase Edge Function: create FLPT account without sending a confirmation email.
// Deploy: supabase functions deploy create-account
// Uses service role only on the server — never expose it to the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const body = await req.json()
    const usernameRaw = String(body.username || '')
    const password = String(body.password || '')
    const displayName = String(body.display_name || body.displayName || '').trim()
    const targetLetDate = body.target_let_date || body.targetLetDate || null

    const username = usernameRaw.toLowerCase().trim()
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return json(400, {
        error: 'Username must be 3–30 characters and use only letters, numbers, and underscores.',
      })
    }
    if (password.length < 6) {
      return json(400, { error: 'Password must be at least 6 characters.' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: 'Server configuration error.' })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Username uniqueness (profile table)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existingProfile) {
      return json(409, { error: 'That username is already taken. Please choose another.' })
    }

    // Internal identity only — never shown to the user
    const email = `${username}@flpt.app`

    // email_confirm: true → account is confirmed immediately, NO confirmation email is sent
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName || username,
        target_let_date: targetLetDate,
      },
    })

    if (createError) {
      const msg = (createError.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return json(409, { error: 'That username is already taken. Please choose another.' })
      }
      return json(400, { error: createError.message || 'Could not create account.' })
    }

    // Ensure profile fields are correct (trigger may have inserted defaults)
    if (created.user?.id) {
      await admin.from('profiles').upsert({
        id: created.user.id,
        username,
        display_name: displayName || username,
        target_let_date: targetLetDate,
        role: 'USER',
      })
    }

    return json(200, {
      ok: true,
      user_id: created.user?.id,
      username,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json(500, { error: message })
  }
})
