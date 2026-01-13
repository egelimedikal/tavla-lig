-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  association_id UUID REFERENCES public.associations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can view active announcements
CREATE POLICY "Active announcements viewable by everyone"
  ON public.announcements FOR SELECT
  USING (is_active = true);

-- Admins can view all announcements
CREATE POLICY "Admins can view all announcements"
  ON public.announcements FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.is_association_admin(auth.uid(), association_id)
  );

-- Admins can insert announcements
CREATE POLICY "Admins can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.is_association_admin(auth.uid(), association_id)
  );

-- Admins can update announcements
CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.is_association_admin(auth.uid(), association_id)
  );

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
  ON public.announcements FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.is_association_admin(auth.uid(), association_id)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();