
-- Create association_admins table to link admins to specific associations
CREATE TABLE public.association_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (association_id, user_id)
);

-- Enable RLS on association_admins
ALTER TABLE public.association_admins ENABLE ROW LEVEL SECURITY;

-- RLS policies for association_admins
CREATE POLICY "Association admins viewable by super admins and association admins"
ON public.association_admins
FOR SELECT
USING (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR user_id = auth.uid()
);

CREATE POLICY "Super admins can insert association admins"
ON public.association_admins
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete association admins"
ON public.association_admins
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create function to check if user is admin of an association
CREATE OR REPLACE FUNCTION public.is_association_admin(_user_id uuid, _association_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.association_admins
        WHERE user_id = _user_id
          AND association_id = _association_id
    ) OR has_role(_user_id, 'super_admin'::app_role)
$$;

-- Update leagues policies to allow association admins
DROP POLICY IF EXISTS "Admins can insert leagues" ON public.leagues;
DROP POLICY IF EXISTS "Admins can update leagues" ON public.leagues;
DROP POLICY IF EXISTS "Admins can delete leagues" ON public.leagues;

CREATE POLICY "Admins can insert leagues"
ON public.leagues
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_association_admin(auth.uid(), association_id)
);

CREATE POLICY "Admins can update leagues"
ON public.leagues
FOR UPDATE
USING (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_association_admin(auth.uid(), association_id)
);

CREATE POLICY "Admins can delete leagues"
ON public.leagues
FOR DELETE
USING (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_association_admin(auth.uid(), association_id)
);

-- Update matches policies to allow association admins
DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;

CREATE POLICY "Admins can update matches"
ON public.matches
FOR UPDATE
USING (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
        SELECT 1 FROM public.leagues l 
        WHERE l.id = league_id 
        AND is_association_admin(auth.uid(), l.association_id)
    )
);

CREATE POLICY "Admins can delete matches"
ON public.matches
FOR DELETE
USING (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
        SELECT 1 FROM public.leagues l 
        WHERE l.id = league_id 
        AND is_association_admin(auth.uid(), l.association_id)
    )
);

-- Update league_players policies to allow association admins
DROP POLICY IF EXISTS "Admins can insert league_players" ON public.league_players;
DROP POLICY IF EXISTS "Admins can delete league_players" ON public.league_players;

CREATE POLICY "Admins can insert league_players"
ON public.league_players
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
        SELECT 1 FROM public.leagues l 
        WHERE l.id = league_id 
        AND is_association_admin(auth.uid(), l.association_id)
    )
);

CREATE POLICY "Admins can delete league_players"
ON public.league_players
FOR DELETE
USING (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
        SELECT 1 FROM public.leagues l 
        WHERE l.id = league_id 
        AND is_association_admin(auth.uid(), l.association_id)
    )
);
