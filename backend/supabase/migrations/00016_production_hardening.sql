-- Production hardening: ticket filing, indexes, activity read for admins

-- Customers can open support tickets
DROP POLICY IF EXISTS support_tickets_requester_insert ON public.support_tickets;
CREATE POLICY support_tickets_requester_insert ON public.support_tickets
  FOR INSERT
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_requester_read ON public.support_tickets;
CREATE POLICY support_tickets_requester_read ON public.support_tickets
  FOR SELECT
  USING (requester_id = auth.uid() OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_users_status_role ON public.users(status, role);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON public.users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_dealers_verification ON public.dealers(verification_status);
