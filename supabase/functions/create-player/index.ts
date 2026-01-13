import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get request body
    const { phone, password, name } = await req.json();

    console.log('Creating player with phone:', phone);

    if (!phone || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Telefon, şifre ve isim gerekli' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format phone to email format for auth
    const formattedPhone = phone.replace(/\D/g, '');
    const phoneEmail = `${formattedPhone}@tavla.app`;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === phoneEmail);

    if (existingUser) {
      console.log('User already exists with email:', phoneEmail);
      return new Response(
        JSON.stringify({ error: 'Bu telefon numarası zaten kayıtlı' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Auth user created:', authData.user?.id);

    // Format phone for profile
    const profilePhone = phone.startsWith('+') ? phone : `+90${formattedPhone}`;

    // Check if profile with this phone exists (admin pre-created)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone', profilePhone)
      .maybeSingle();

    let profile;

    if (existingProfile) {
      // Update existing profile with user_id
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ user_id: authData.user!.id, name: name })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
      }
      profile = updatedProfile;
      console.log('Profile updated:', profile?.id);
    } else {
      // Create new profile
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user!.id,
          name: name,
          phone: profilePhone,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
      profile = newProfile;
      console.log('Profile created:', profile?.id);
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
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
