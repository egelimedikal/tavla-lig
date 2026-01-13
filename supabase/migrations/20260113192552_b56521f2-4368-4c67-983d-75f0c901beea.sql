-- Add logo_url column to associations table
ALTER TABLE public.associations 
ADD COLUMN logo_url TEXT;

-- Create storage bucket for association logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('association-logos', 'association-logos', true);

-- Allow anyone to view association logos (public bucket)
CREATE POLICY "Association logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'association-logos');

-- Allow authenticated users to upload association logos
CREATE POLICY "Authenticated users can upload association logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'association-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update association logos
CREATE POLICY "Authenticated users can update association logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'association-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete association logos
CREATE POLICY "Authenticated users can delete association logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'association-logos' AND auth.role() = 'authenticated');