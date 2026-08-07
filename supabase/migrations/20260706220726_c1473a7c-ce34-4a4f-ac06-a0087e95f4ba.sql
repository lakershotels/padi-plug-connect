
-- Storage policies for dispute-evidence
CREATE POLICY "dispute evidence upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dispute evidence read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- Allow dispute opener to update their evidence list; admins can update too
CREATE POLICY "disputes opener update evidence"
ON public.disputes FOR UPDATE TO authenticated
USING (auth.uid() = opened_by)
WITH CHECK (auth.uid() = opened_by);
