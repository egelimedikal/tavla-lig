import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Input Validation ---
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateDeletePlayerInput(body: unknown): { playerId: string } | string {
  if (!body || typeof body !== 'object') return 'Geçersiz istek gövdesi';
  const { playerId } = body as Record<string, unknown>;

  if (typeof playerId !== 'string' || !playerId.trim()) return 'Oyuncu ID gerekli';
  const trimmedId = playerId.trim();
  if (!UUID_REGEX.test(trimmedId)) return 'Geçersiz oyuncu ID formatı';

  return { playerId: trimmedId };
}

// --- In-Memory Rate Limiter ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 10; // max 10 deletions per 5 minutes per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Yetkilendirme gerekli' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz oturum' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = userData.user.id;

    // Check if caller has admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    
    // Check if caller is association admin
    const { data: assocAdmins } = await supabaseClient
      .from('association_admins')
      .select('id')
      .eq('user_id', callerId)
      .limit(1);

    const isAssociationAdmin = assocAdmins && assocAdmins.length > 0;

    if (!isAdmin && !isAssociationAdmin) {
      return new Response(
        JSON.stringify({ error: 'Bu işlem için admin yetkisi gerekli' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    if (!checkRateLimit(callerId)) {
      return new Response(
        JSON.stringify({ error: 'Çok fazla istek. Lütfen birkaç dakika bekleyin.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified, caller_id:', callerId);

    // Validate input
    const rawBody = await req.json();
    const validation = validateDeletePlayerInput(rawBody);

    if (typeof validation === 'string') {
      return new Response(
        JSON.stringify({ error: validation }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { playerId } = validation;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the player's profile to find user_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', playerId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Oyuncu bulunamadı' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = profile?.user_id;

    // Check if the player has a super_admin role
    let isSuperAdmin = false;
    if (userId) {
      const { data: playerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'super_admin')
        .maybeSingle();
      
      isSuperAdmin = !!playerRoles;
    }

    // Delete league_players entries first
    const { error: lpError } = await supabaseAdmin
      .from('league_players')
      .delete()
      .eq('player_id', playerId);

    if (lpError) {
      console.error('League players delete error:', lpError);
    }

    // Delete matches where this player participated
    const { error: matchesError } = await supabaseAdmin
      .from('matches')
      .delete()
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);

    if (matchesError) {
      console.error('Matches delete error:', matchesError);
    }

    // Delete tournament_matches where this player participated
    const { error: tmError } = await supabaseAdmin
      .from('tournament_matches')
      .delete()
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);

    if (tmError) {
      console.error('Tournament matches delete error:', tmError);
    }

    // Delete tournament_players entries
    const { error: tpError } = await supabaseAdmin
      .from('tournament_players')
      .delete()
      .eq('player_id', playerId);

    if (tpError) {
      console.error('Tournament players delete error:', tpError);
    }

    // If super_admin, keep profile and auth account but remove from leagues/matches only
    if (isSuperAdmin) {
      console.log('Super admin player - keeping auth account and profile, only removed league/match data:', playerId);
      return new Response(
        JSON.stringify({ success: true, message: 'Super admin oyuncu lig ve maç verilerinden silindi, hesabı korundu.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the profile (non-super-admin users)
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', playerId);

    if (deleteProfileError) {
      console.error('Profile delete error:', deleteProfileError);
      return new Response(
        JSON.stringify({ error: 'Oyuncu profili silinemedi' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile deleted:', playerId);

    // Delete the auth user if exists (non-super-admin users only)
    if (userId) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authDeleteError) {
        console.error('Auth user delete error:', authDeleteError);
      } else {
        console.log('Auth user deleted:', userId);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
