-- Add DELETE policy for admins on profiles table
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 
    FROM league_players lp
    JOIN leagues l ON l.id = lp.league_id
    WHERE lp.player_id = profiles.id 
    AND is_association_admin(auth.uid(), l.association_id)
  )
);