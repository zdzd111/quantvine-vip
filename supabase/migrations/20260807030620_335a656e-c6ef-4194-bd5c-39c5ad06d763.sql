CREATE POLICY "own proofs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deposit-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own proofs select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deposit-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "admin proofs select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deposit-proofs' AND public.has_role(auth.uid(),'admin'));