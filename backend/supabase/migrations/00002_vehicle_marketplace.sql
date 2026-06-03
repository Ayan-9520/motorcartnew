-- Vehicle marketplace: public enquiry leads + test drives

DROP POLICY IF EXISTS leads_insert_public ON public.leads;
CREATE POLICY leads_insert_public ON public.leads
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR (name IS NOT NULL AND phone IS NOT NULL AND length(phone) >= 10)
  );

-- Allow customers to read their own submitted leads (optional)
DROP POLICY IF EXISTS leads_customer_read ON public.leads;
CREATE POLICY leads_customer_read ON public.leads
  FOR SELECT
  USING (customer_id = auth.uid());
