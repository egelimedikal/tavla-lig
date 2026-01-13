-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

-- Create a view that hides sensitive fields (phone)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    name,
    avatar_url,
    must_change_password,
    created_at,
    updated_at
  FROM public.profiles;
  -- Excludes: phone

-- Users can view their own full profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all profiles (for admin panel)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- Association admins can view profiles of players in their leagues
CREATE POLICY "Association admins can view league player profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.league_players lp
      JOIN public.leagues l ON l.id = lp.league_id
      WHERE lp.player_id = profiles.id
      AND public.is_association_admin(auth.uid(), l.association_id)
    )
  );