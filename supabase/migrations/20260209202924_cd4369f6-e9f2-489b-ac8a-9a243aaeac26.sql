
-- Add current_year and active_season columns to leagues table
ALTER TABLE public.leagues ADD COLUMN current_year integer DEFAULT NULL;
ALTER TABLE public.leagues ADD COLUMN active_season text DEFAULT NULL;
