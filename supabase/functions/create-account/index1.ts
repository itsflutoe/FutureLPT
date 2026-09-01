// Admin-only password reset. Service role stays on the server.
// Deploy: supabase functions deploy admin-reset-password
//
// Body: { user_id: string, new_password: string }
// Header: Authorization: Bearer <admin user JWT>

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(500, { error: 'Server configuration error.' })
    }

    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized.' })
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Verify caller with their JWT (anon client + user token)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser(jwt)
    if (userError || !userData.user) {
      return json(401, { error: 'Unauthorized.' })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profileError || !profile || profile.role !== 'ADMIN') {
      return json(403, { error: 'Only administrators can reset passwords.' })
    }

    const body = await req.json()
    const targetUserId = String(body.user_id || body.userId || '').trim()
    const newPassword = String(body.new_password || body.newPassword || '')

    if (!targetUserId) {
      return json(400, { error: 'Target user not found.' })
    }
    if (newPassword.length < 6) {
      return json(400, { error: 'Password must be at least 6 characters.' })
    }

    const { data: targetProfile, error: targetError } = await admin
      .from('profiles')
      .select('id, username')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetError || !targetProfile) {
      return json(404, { error: 'Target user not found.' })
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    })

    if (updateError) {
      return json(400, { error: updateError.message || 'Could not reset password.' })
    }

    return json(200, {
      ok: true,
      message: 'Password successfully reset.',
      username: targetProfile.username,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json(500, { error: message })
  }
})
