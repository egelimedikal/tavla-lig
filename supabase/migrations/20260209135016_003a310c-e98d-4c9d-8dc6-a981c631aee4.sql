
-- Create tournament status enum
CREATE TYPE public.tournament_status AS ENUM ('active', 'completed');

-- Create tournaments table
CREATE TABLE public.tournaments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  association_id uuid REFERENCES public.associations(id),
  status tournament_status NOT NULL DEFAULT 'active',
  current_round integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_association_admin(auth.uid(), association_id)
  );

CREATE POLICY "Admins can update tournaments" ON public.tournaments
  FOR UPDATE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_association_admin(auth.uid(), association_id)
  );

CREATE POLICY "Admins can delete tournaments" ON public.tournaments
  FOR DELETE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_association_admin(auth.uid(), association_id)
  );

-- Create tournament_players table
CREATE TABLE public.tournament_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initial_rights integer NOT NULL DEFAULT 4 CHECK (initial_rights IN (2, 3, 4)),
  losses integer NOT NULL DEFAULT 0,
  is_eliminated boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament players viewable by everyone" ON public.tournament_players
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournament players" ON public.tournament_players
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_players.tournament_id
      AND is_association_admin(auth.uid(), t.association_id)
    )
  );

CREATE POLICY "Admins can update tournament players" ON public.tournament_players
  FOR UPDATE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_players.tournament_id
      AND is_association_admin(auth.uid(), t.association_id)
    )
  );

CREATE POLICY "Admins can delete tournament players" ON public.tournament_players
  FOR DELETE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_players.tournament_id
      AND is_association_admin(auth.uid(), t.association_id)
    )
  );

-- Create tournament_matches table
CREATE TABLE public.tournament_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  player1_id uuid REFERENCES public.profiles(id),
  player2_id uuid REFERENCES public.profiles(id),
  score1 integer,
  score2 integer,
  winner_id uuid REFERENCES public.profiles(id),
  is_bye boolean NOT NULL DEFAULT false,
  match_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament matches viewable by everyone" ON public.tournament_matches
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournament matches" ON public.tournament_matches
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
      AND is_association_admin(auth.uid(), t.association_id)
    )
  );

CREATE POLICY "Admins can update tournament matches" ON public.tournament_matches
  FOR UPDATE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
      AND is_association_admin(auth.uid(), t.association_id)
    )
  );

CREATE POLICY "Admins can delete tournament matches" ON public.tournament_matches
  FOR DELETE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
      AND is_association_admin(auth.uid(), t.association_id)
    )
  );

-- Add trigger for updated_at on tournaments
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
