-- Fix overly permissive storage policies for association-logos bucket
-- Restrict upload/update/delete to admins and super_admins only

DROP POLICY IF EXISTS "Authenticated users can upload association logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update association logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete association logos" ON storage.objects;

-- Allow only admins/super_admins to upload association logos
CREATE POLICY "Admins can upload association logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'association-logos' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Allow only admins/super_admins to update association logos
CREATE POLICY "Admins can update association logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'association-logos' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Allow only admins/super_admins to delete association logos
CREATE POLICY "Admins can delete association logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'association-logos' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);