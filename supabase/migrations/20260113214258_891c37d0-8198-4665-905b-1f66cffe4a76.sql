-- Add year and active_season columns to associations table
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS current_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
ADD COLUMN IF NOT EXISTS active_season TEXT;