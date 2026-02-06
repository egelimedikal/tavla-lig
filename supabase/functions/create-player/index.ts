import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Input Validation ---
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const NAME_MAX_LENGTH = 100;
const NAME_MIN_LENGTH = 2;
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 72;

// --- In-Memory Rate Limiter ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 10; // max 10 creations per 5 minutes per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

function validateCreatePlayerInput(body: unknown): { phone: string; password: string; name: string } | string {
  if (!body || typeof body !== 'object') return 'Geçersiz istek gövdesi';
  const { phone, password, name } = body as Record<string, unknown>;

  if (typeof phone !== 'string' || !phone.trim()) return 'Telefon numarası gerekli';
  if (typeof password !== 'string' || !password) return 'Şifre gerekli';
  if (typeof name !== 'string' || !name.trim()) return 'İsim gerekli';

  const trimmedName = name.trim();
  if (trimmedName.length < NAME_MIN_LENGTH) return `İsim en az ${NAME_MIN_LENGTH} karakter olmalı`;
  if (trimmedName.length > NAME_MAX_LENGTH) return `İsim en fazla ${NAME_MAX_LENGTH} karakter olmalı`;

  if (password.length < PASSWORD_MIN_LENGTH) return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olmalı`;

  const strippedPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (!PHONE_REGEX.test(strippedPhone)) return 'Geçersiz telefon numarası formatı (örn: +905551234567)';

  return { phone: strippedPhone, password, name: trimmedName };
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

    console.log('Admin verified, user_id:', userId);
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get and validate request body
    const rawBody = await req.json();
    const validation = validateCreatePlayerInput(rawBody);
    
    if (typeof validation === 'string') {
      return new Response(
        JSON.stringify({ error: validation }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, password, name } = validation;

    console.log('Creating player with phone:', phone.substring(0, 5) + '***');

    // Format phone to email format for auth
    const formattedPhone = phone.replace(/\D/g, '');
    const phoneEmail = `${formattedPhone}@tavla.app`;

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === phoneEmail);

    if (existingUser) {
      console.log('User already exists with email:', phoneEmail);
      
      // Check if this user has a profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();
      
      if (existingProfile) {
        // User exists with profile - this is a real duplicate
        return new Response(
          JSON.stringify({ error: 'Bu telefon numarası zaten kayıtlı' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        // Orphaned auth user (no profile) - delete it first
        console.log('Found orphaned auth user, deleting:', existingUser.id);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        if (deleteError) {
          console.error('Failed to delete orphaned user:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Eski kullanıcı kaydı silinemedi' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        console.log('Orphaned user deleted, proceeding with creation');
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: phoneEmail,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name,
        phone: phone,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Kullanıcı oluşturulamadı' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Auth user created:', authData.user?.id);

    // Format phone for profile
    const profilePhone = phone.startsWith('+') ? phone : `+90${formattedPhone}`;

    // Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if profile was created by trigger (handle_new_user)
    const { data: triggerCreatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user!.id)
      .maybeSingle();

    let profile;

    if (triggerCreatedProfile) {
      // Trigger already created profile, update it with phone and name
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          name: name, 
          phone: profilePhone,
          must_change_password: true 
        })
        .eq('id', triggerCreatedProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
      }
      profile = updatedProfile;
      console.log('Profile updated (trigger-created):', profile?.id);
    } else {
      // Check if profile with this phone exists (admin pre-created)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone', profilePhone)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile with user_id
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ user_id: authData.user!.id, name: name, must_change_password: true })
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (updateError) {
          console.error('Profile update error:', updateError);
        }
        profile = updatedProfile;
        console.log('Profile updated (pre-created):', profile?.id);
      } else {
        // Create new profile (fallback - shouldn't happen with trigger)
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: authData.user!.id,
            name: name,
            phone: profilePhone,
            must_change_password: true,
          })
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
        profile = newProfile;
        console.log('Profile created:', profile?.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        profile: profile,
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
