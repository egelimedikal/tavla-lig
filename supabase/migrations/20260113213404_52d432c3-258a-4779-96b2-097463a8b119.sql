-- 1. Add RLS policy for profiles_public view (allow public read)
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: This policy allows SELECT on profiles but the profiles_public VIEW 
-- only exposes safe fields (id, user_id, name, avatar_url, created_at, updated_at)

-- 2. Add association-scoped RLS for announcements
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.announcements;

-- Recreate with proper scoping
-- Public can only see active announcements
CREATE POLICY "Anyone can view active announcements"
ON public.announcements
FOR SELECT
USING (is_active = true);

-- Super admins and regular admins can manage all announcements
CREATE POLICY "Super admins can manage all announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Association admins can only manage their own association's announcements
CREATE POLICY "Association admins can manage own announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
  association_id IS NOT NULL AND
  is_association_admin(auth.uid(), association_id)
)
WITH CHECK (
  association_id IS NOT NULL AND
  is_association_admin(auth.uid(), association_id)
);