import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Input Validation ---
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 72;

// --- In-Memory Rate Limiter ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 20; // max 20 resets per 10 minutes per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

function validateResetPasswordInput(body: unknown): { user_id: string; new_password: string; new_email?: string } | string {
  if (!body || typeof body !== 'object') return 'Geçersiz istek gövdesi';
  const { user_id, new_password, new_email } = body as Record<string, unknown>;

  if (typeof user_id !== 'string' || !user_id.trim()) return 'Kullanıcı ID gerekli';
  if (!UUID_REGEX.test(user_id.trim())) return 'Geçersiz kullanıcı ID formatı';

  if (typeof new_password !== 'string' || !new_password) return 'Yeni şifre gerekli';
  if (new_password.length < PASSWORD_MIN_LENGTH) return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı`;
  if (new_password.length > PASSWORD_MAX_LENGTH) return `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olmalı`;

  if (new_email !== undefined && new_email !== null) {
    if (typeof new_email !== 'string') return 'Geçersiz e-posta formatı';
    if (new_email.trim() && !EMAIL_REGEX.test(new_email.trim())) return 'Geçersiz e-posta formatı';
  }

  return {
    user_id: user_id.trim(),
    new_password,
    new_email: typeof new_email === 'string' && new_email.trim() ? new_email.trim() : undefined,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get the current user from the token
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz oturum' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Check if user has admin role
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Role check error:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Rol kontrolü başarısız' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    
    // Check if user is association admin
    const { data: assocAdmins } = await supabaseClient
      .from('association_admins')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    const isAssociationAdmin = assocAdmins && assocAdmins.length > 0;

    if (!isAdmin && !isAssociationAdmin) {
      return new Response(
        JSON.stringify({ error: 'Bu işlem için admin yetkisi gerekli' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: 'Çok fazla istek. Lütfen birkaç dakika bekleyin.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified for password reset, user_id:', userId);
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get and validate request body
    const rawBody = await req.json();
    const validation = validateResetPasswordInput(rawBody);

    if (typeof validation === 'string') {
      return new Response(
        JSON.stringify({ error: validation }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, new_password, new_email } = validation;

    console.log('Resetting password for user_id:', user_id);

    // Build update object
    const updateData: { password: string; email?: string } = { password: new_password };
    if (new_email) {
      updateData.email = new_email;
    }

    // Update user password (and optionally email) using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      updateData
    );

    if (error) {
      console.error('Password reset error:', error);
      return new Response(
        JSON.stringify({ error: 'Şifre sıfırlama başarısız' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Password reset successful for user:', data.user?.id);

    // Update profile to set must_change_password = true
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('user_id', user_id);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Şifre başarıyla sıfırlandı',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Sunucu hatası oluştu' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
