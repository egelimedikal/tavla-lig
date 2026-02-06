
-- Fix: Remove overly permissive admin access to push subscription credentials
-- Admins don't need direct access to push notification tokens (auth, p256dh, endpoint)
-- These are sensitive credentials that could be abused for unauthorized push notifications
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.push_subscriptions;

-- Only super_admins should have access for system administration purposes
CREATE POLICY "Super admins can view all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));
