
-- Create associations table for regional groups (Bursa, Sakarya, İzmir, etc.)
CREATE TABLE public.associations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on associations
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;

-- Add association_id to leagues table
ALTER TABLE public.leagues ADD COLUMN association_id uuid REFERENCES public.associations(id) ON DELETE CASCADE;

-- Create trigger for updated_at on associations
CREATE TRIGGER update_associations_updated_at
BEFORE UPDATE ON public.associations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies for associations
CREATE POLICY "Associations viewable by everyone"
ON public.associations
FOR SELECT
USING (true);

CREATE POLICY "Super admins and admins can insert associations"
ON public.associations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins and admins can update associations"
ON public.associations
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins and admins can delete associations"
ON public.associations
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update user_roles policies for super_admin management
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Super admins can insert any role"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete any role"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Update current admin to super_admin for y.kanmaz@msn.com
UPDATE public.user_roles 
SET role = 'super_admin'::app_role 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'y.kanmaz@msn.com');

-- Insert Bursa Tavla Derneği as first association
INSERT INTO public.associations (name, slug, description)
VALUES ('Bursa Tavla Derneği', 'bursa', 'Bursa Tavla Derneği');
