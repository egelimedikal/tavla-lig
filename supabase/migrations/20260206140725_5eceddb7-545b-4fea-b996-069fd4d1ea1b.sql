
-- Fix 1: Add admin role check to get_default_player_password() function
CREATE OR REPLACE FUNCTION public.get_default_player_password()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins and super admins
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  RETURN (SELECT value FROM public.app_settings WHERE key = 'default_player_password');
END;
$$;

-- Fix 2: Remove the overly permissive "Anyone can view public profiles" policy
-- This exposes phone numbers and other sensitive PII to any user
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;
