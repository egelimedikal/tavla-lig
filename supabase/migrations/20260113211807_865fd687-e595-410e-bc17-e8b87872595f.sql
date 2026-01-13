-- Add image_url column to announcements
ALTER TABLE public.announcements ADD COLUMN image_url TEXT;

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true);

-- Storage policies for announcement images
CREATE POLICY "Announcement images publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-images');

CREATE POLICY "Admins can upload announcement images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'announcement-images' AND
    (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'super_admin') OR
      EXISTS (
        SELECT 1 FROM public.association_admins
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can update announcement images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'announcement-images' AND
    (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'super_admin') OR
      EXISTS (
        SELECT 1 FROM public.association_admins
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can delete announcement images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'announcement-images' AND
    (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'super_admin') OR
      EXISTS (
        SELECT 1 FROM public.association_admins
        WHERE user_id = auth.uid()
      )
    )
  );