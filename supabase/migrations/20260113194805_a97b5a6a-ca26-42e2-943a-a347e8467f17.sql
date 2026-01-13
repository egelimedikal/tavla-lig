-- Drop the existing policy first
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with different name
CREATE POLICY "Profile owners can update their profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);