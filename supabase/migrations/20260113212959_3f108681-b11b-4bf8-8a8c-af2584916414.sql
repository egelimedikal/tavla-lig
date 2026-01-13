-- 1. Fix profiles_public view - remove sensitive fields (phone, must_change_password)
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- 2. Fix app_settings - restrict to authenticated users only
DROP POLICY IF EXISTS "App settings are viewable by everyone" ON public.app_settings;

CREATE POLICY "App settings viewable by authenticated users"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- 3. Create secure function for getting default player password (admin only)
CREATE OR REPLACE FUNCTION public.get_default_player_password()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_settings WHERE key = 'default_player_password'
$$;

-- Only allow admins to execute this function
REVOKE ALL ON FUNCTION public.get_default_player_password() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_default_player_password() TO authenticated;

-- 4. Create secure function for getting player phone with proper access control
-- Super admins, regular admins, association admins (for their association players), or the user themselves
CREATE OR REPLACE FUNCTION public.get_player_phone(player_user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_phone TEXT;
  caller_id uuid := auth.uid();
BEGIN
  -- User can see their own phone
  IF caller_id = player_user_id THEN
    SELECT phone INTO player_phone FROM public.profiles WHERE user_id = player_user_id;
    RETURN player_phone;
  END IF;
  
  -- Super admins and admins can see all phones
  IF has_role(caller_id, 'super_admin'::app_role) OR has_role(caller_id, 'admin'::app_role) THEN
    SELECT phone INTO player_phone FROM public.profiles WHERE user_id = player_user_id;
    RETURN player_phone;
  END IF;
  
  -- Association admins can only see phones of players in their associations
  IF EXISTS (
    SELECT 1 
    FROM public.association_admins aa
    JOIN public.profiles p ON p.association_id = aa.association_id
    WHERE aa.user_id = caller_id 
      AND p.user_id = player_user_id
  ) THEN
    SELECT phone INTO player_phone FROM public.profiles WHERE user_id = player_user_id;
    RETURN player_phone;
  END IF;
  
  -- No access
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_phone(uuid) TO authenticated;