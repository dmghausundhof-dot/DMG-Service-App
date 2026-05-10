-- Aufräumen der Storage-Dateien eines Nutzers vor Löschung des Auth-Users (wird von API mit Service Role genutzt).
-- Pfadkonventionen: asset-images: {user_id}/… und appointments/{user_id}/… ;
-- documents: documents/{object_id}/…

CREATE OR REPLACE FUNCTION public.delete_user_storage_objects(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'asset-images'
    AND (
      name = p_user_id::text
      OR name LIKE p_user_id::text || '/%'
      OR name LIKE 'appointments/' || p_user_id::text || '/%'
    );

  DELETE FROM storage.objects AS d
  WHERE d.bucket_id = 'documents'
    AND EXISTS (
      SELECT 1
      FROM public.objects o
      INNER JOIN public.profiles pr ON o.profile_id = pr.id
      WHERE pr.user_id = p_user_id
        AND d.name LIKE 'documents/' || o.id::text || '/%'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_storage_objects(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_storage_objects(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_user_storage_objects(uuid) IS
  'Löscht alle Storage-Objekte eines Nutzers (nur service_role / Backend; vor auth.admin.deleteUser aufrufen).'
