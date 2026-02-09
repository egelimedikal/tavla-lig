
-- Add status column to leagues (active/completed like tournaments)
ALTER TABLE public.leagues ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add updated_at column to leagues
ALTER TABLE public.leagues ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_leagues_updated_at
BEFORE UPDATE ON public.leagues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
