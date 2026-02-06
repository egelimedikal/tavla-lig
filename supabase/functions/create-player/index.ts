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

    console.log('Admin verified, user_id:', userId);
    
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
            JSON.stringify({ error: 'Eski kullanıcı kaydı silinemedi: ' + deleteError.message }),
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
