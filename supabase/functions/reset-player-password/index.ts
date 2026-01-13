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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz oturum' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

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

    console.log('Admin verified for password reset, user_id:', userId);
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get request body
    const { user_id, new_password, new_email } = await req.json();

    console.log('Resetting password for user_id:', user_id);

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Kullanıcı ID ve yeni şifre gerekli' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
        JSON.stringify({ error: error.message }),
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
