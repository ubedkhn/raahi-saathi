-- Allow authenticated users to upload to kyc_documents bucket
CREATE POLICY "Allow authenticated uploads to kyc_documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc_documents');