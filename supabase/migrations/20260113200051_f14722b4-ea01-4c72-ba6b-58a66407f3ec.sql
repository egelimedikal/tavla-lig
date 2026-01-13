-- Add must_change_password field to profiles
ALTER TABLE public.profiles 
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT true;

-- Set existing users to false (they don't need to change)
UPDATE public.profiles SET must_change_password = false WHERE user_id IS NOT NULL;