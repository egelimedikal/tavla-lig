
-- 1. Drop all policies referencing is_association_admin or association_admins

-- storage.objects
DROP POLICY IF EXISTS "Admins can upload announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete announcement images" ON storage.objects;

-- leagues
DROP POLICY IF EXISTS "Admins can insert leagues" ON public.leagues;
DROP POLICY IF EXISTS "Admins can update leagues" ON public.leagues;
DROP POLICY IF EXISTS "Admins can delete leagues" ON public.leagues;

-- matches
DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;
DROP POLICY IF EXISTS "Players and admins can insert matches" ON public.matches;

-- league_players
DROP POLICY IF EXISTS "Admins can insert league_players" ON public.league_players;
DROP POLICY IF EXISTS "Admins can delete league_players" ON public.league_players;

-- profiles
DROP POLICY IF EXISTS "Association admins can view league player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- announcements
DROP POLICY IF EXISTS "Admins can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Association admins can manage own announcements" ON public.announcements;

-- tournament_matches
DROP POLICY IF EXISTS "Admins can insert tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Admins can update tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Admins can delete tournament matches" ON public.tournament_matches;

-- tournament_players
DROP POLICY IF EXISTS "Admins can insert tournament players" ON public.tournament_players;
DROP POLICY IF EXISTS "Admins can update tournament players" ON public.tournament_players;
DROP POLICY IF EXISTS "Admins can delete tournament players" ON public.tournament_players;

-- tournaments
DROP POLICY IF EXISTS "Admins can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;

-- association_admins table policies
DROP POLICY IF EXISTS "Association admins viewable by super admins and association adm" ON public.association_admins;
DROP POLICY IF EXISTS "Super admins can delete association admins" ON public.association_admins;
DROP POLICY IF EXISTS "Super admins can insert association admins" ON public.association_admins;

-- 2. Drop association_admins table
DROP TABLE IF EXISTS public.association_admins;

-- 3. Drop is_association_admin function
DROP FUNCTION IF EXISTS public.is_association_admin(uuid, uuid);

-- 4. Recreate policies without association admin references

-- leagues
CREATE POLICY "Admins can insert leagues" ON public.leagues FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update leagues" ON public.leagues FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete leagues" ON public.leagues FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- matches
CREATE POLICY "Admins can update matches" ON public.matches FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete matches" ON public.matches FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Players and admins can insert matches" ON public.matches FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() IS NOT NULL AND (
    player1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR player2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ))
);

-- league_players
CREATE POLICY "Admins can insert league_players" ON public.league_players FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete league_players" ON public.league_players FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- announcements
CREATE POLICY "Admins can view all announcements" ON public.announcements FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert announcements" ON public.announcements FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- tournament_matches
CREATE POLICY "Admins can insert tournament matches" ON public.tournament_matches FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tournament matches" ON public.tournament_matches FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tournament matches" ON public.tournament_matches FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- tournament_players
CREATE POLICY "Admins can insert tournament players" ON public.tournament_players FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tournament players" ON public.tournament_players FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tournament players" ON public.tournament_players FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- tournaments
CREATE POLICY "Admins can insert tournaments" ON public.tournaments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tournaments" ON public.tournaments FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- storage: announcement images
CREATE POLICY "Admins can upload announcement images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'announcement-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Admins can update announcement images" ON storage.objects FOR UPDATE
USING (bucket_id = 'announcement-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Admins can delete announcement images" ON storage.objects FOR DELETE
USING (bucket_id = 'announcement-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));
