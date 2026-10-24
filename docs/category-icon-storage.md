# AasPaas category illustrations — Supabase Storage

## Storage

The existing `place-photos` private bucket continues serving individual
venue photographs. Illustrated food-category artwork uses the **public**
`category-icons` bucket under `v1/<icon>.webp`. The bucket accepts only
WebP files smaller than 1 MB. Public download access **does not grant public upload**.

## Uploading the artwork

1. Get the approved `aaspaas_20_individual_icons.zip` from this ChatGPT
   conversation and extract it.
2. From the repository root, install the existing project dependencies (`npm ci`).
3. Set `SUPABASE_URL=https://besbdmgryvwaqdyolmej.supabase.co` and
   `SUPABASE_SERVICE_ROLE_KEY` in your **local shell only**. Find the
   service role secret in Supabase project API settings. Never commit it,
   expose it as `VITE_*`, paste it into frontend code, or share it.
4. Run:

   ```bash
   node scripts/upload-category-icons.mjs /path/to/aaspaas_20_individual_icons/webp
   ```

5. Check the 19 objects in
   `https://supabase.com/dashboard/project/besbdmgryvwaqdyolmej/storage/buckets/category-icons`.
   Visit `https://besbdmgryvwaqdyolmej.supabase.co/storage/v1/object/public/category-icons/v1/biryani.webp`
   to confirm a public URL displays the image.
6. Refresh the website (or redeploy the latest GitHub main commit if your
   site does not auto-deploy). Category chips, detail views, list rows, and
   MapLibre food markers automatically prefer Supabase artwork.

The generated reference sheet contains Chinese Noodles instead of the official
Sweets category. Do not mislabel Noodles as Sweets. The upload script handles
the **19 correctly matched official category icons** and leaves Sweets on its
existing bundled SVG fallback until a genuine Sweets illustration is provided.

## How the fallback works

The browser checks `VITE_SUPABASE_URL` (already used for Supabase reads), then
uses the public Storage URL above. If the image is not present, the map returns
to the original bundled WebP/SVG icon; filters and details also fall back.
Upload and deployment do not need a schema change to `public.places`.

## Upload safety

The uploader is an explicit admin-only local script. Do not add an anonymous
INSERT policy on `storage.objects` to make uploads work. Do not overwrite
`place-photos`, and do not modify `places.photo_path`.
