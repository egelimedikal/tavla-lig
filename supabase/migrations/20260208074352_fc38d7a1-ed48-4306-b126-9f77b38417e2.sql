-- Allow all authenticated users to view all profiles
-- This is needed so the standings table can show player names and avatars
-- Sensitive fields (phone) are protected via the get_player_phone function
CREATE POLICY "All authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');
