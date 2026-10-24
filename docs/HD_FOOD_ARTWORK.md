# AasPaas illustrated food artwork

Ten hand-generated miniature food illustrations are stored under `public/icons/illustrated-hd`, each **512 × 512 WebP with transparency**. The original source images were rendered at 1254 × 1254; WebP artwork has been downsampled once at high quality, not upscaled from 128-pixel thumbnails.

File names: biryani, punugulu, samosa, chai, jalebi, chaat, dosa, pani-puri, kebab, idli. The `src/features/map/layers/icons.ts` resolver uses these exact names to select the correct asset for each shop.

All former ~1–7 KB thumbnails were removed from `public/icons/illustrated` and `public/food-illustrations`. The renamed asset directory ensures old CDN caches cannot serve blurry copies.

The native MapLibre composite marker in `shopPillMarker.ts` renders the illustration once with the orange dots and white rounded shop-name pill and stays attached to its map coordinate while dragging. Keep the illustration crisp and use native map symbols, not independently positioned HTML elements.

Export future additions from high-resolution alpha PNGs at 512 × 512 WebP quality ~90–95 and avoid 128 × 128 intermediates. Verify transparency and dimensions with Sharp, and do not attach unrelated dish art (e.g. biryani for a mandi shop).
