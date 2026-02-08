-- Drop the existing restrictive insert policy
DROP POLICY "Players can insert matches" ON public.matches;

-- Create a new policy that allows:
-- 1. Admins/super_admins to insert matches for any players
-- 2. Regular players to insert matches they're part of
CREATE POLICY "Players and admins can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = league_id AND is_association_admin(auth.uid(), l.association_id)
  )
  OR (
    auth.uid() IS NOT NULL
    AND (
      player1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR player2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
);