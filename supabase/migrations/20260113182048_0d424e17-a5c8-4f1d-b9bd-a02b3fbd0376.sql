-- Oyuncu profilleri tablosu
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ligler tablosu
CREATE TABLE public.leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Oyuncu-Lig ilişkisi
CREATE TABLE public.league_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, player_id)
);

-- Maçlar tablosu
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score1 INTEGER NOT NULL CHECK (score1 >= 0 AND score1 <= 9),
  score2 INTEGER NOT NULL CHECK (score2 >= 0 AND score2 <= 9),
  winner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Leagues policies (public read)
CREATE POLICY "Leagues viewable by everyone" 
ON public.leagues FOR SELECT 
USING (true);

-- League players policies
CREATE POLICY "League players viewable by everyone" 
ON public.league_players FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can join leagues" 
ON public.league_players FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Matches policies
CREATE POLICY "Matches viewable by everyone" 
ON public.matches FOR SELECT 
USING (true);

CREATE POLICY "Players can insert matches" 
ON public.matches FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (player1_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
   player2_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default leagues
INSERT INTO public.leagues (id, name) VALUES
  ('super-a', 'Süper Lig A'),
  ('super-b', 'Süper Lig B'),
  ('lig1-a', '1. Lig A'),
  ('lig1-b', '1. Lig B');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Yeni Oyuncu'),
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();