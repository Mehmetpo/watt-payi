-- Bound the bill-photos bucket so a caller hitting the Storage REST API
-- directly (bypassing the app, which never actually uploads here — see
-- src/lib/billExtraction.ts) can't run up unlimited storage cost via the
-- otherwise-unrestricted owner-scoped INSERT policy from 0001_init_schema.sql.
update storage.buckets
  set file_size_limit = 8388608, -- 8MB, matches extract-bill's own image cap
      allowed_mime_types = array['image/jpeg', 'image/png']
  where id = 'bill-photos';

-- Let owners delete their own objects (previously insert/select only), and
-- pair it with a cleanup call in delete-account (see that function) so
-- account deletion doesn't leave an orphaned, permanently-unreachable
-- object once the owning auth.users row — and therefore auth.uid() for
-- that path prefix — is gone.
create policy "bill_photos_owner_delete" on storage.objects
  for delete using (bucket_id = 'bill-photos' and (storage.foldername(name))[1] = auth.uid()::text);
