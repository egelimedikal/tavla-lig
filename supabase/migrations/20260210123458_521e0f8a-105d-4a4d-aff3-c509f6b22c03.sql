
-- Fix user_roles INSERT policy: must be PERMISSIVE
DROP POLICY IF EXISTS "Super admins can insert any role" ON public.user_roles;
CREATE POLICY "Super admins can insert any role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix user_roles SELECT policies: need at least one PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix user_roles DELETE policy
DROP POLICY IF EXISTS "Super admins can delete any role" ON public.user_roles;
CREATE POLICY "Super admins can delete any role"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
