-- =====================================================================
-- SkinWise urun verisi: 50 urun (Jira: Sprint 1, Madde 9 - Idil Sunar)
-- schema.sql CALISTIRILDIKTAN SONRA calistirilir.
-- Calistirma: Supabase Dashboard > SQL Editor > dosyanin tamamini yapistir > Run
--
-- Tekrar calistirmak guvenlidir: ayni serial_number varsa urun tekrar eklenmez.
-- Markalar ve distributorler kurgusaldir. Fiyatlar USD (frontend USD gosteriyor).
-- cost bos birakildi: schema.sql'e gore bos ise fiyatin %50'si kullanilir (Madde 11).
-- Gorseller: backend/supabase/product-images/ klasorundeki 50 dosya,
-- Storage'daki 'product-images' bucket'ina yuklenir (dosya adlari ayni kalmali).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Gorseller icin public bucket (yoksa olusturur)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 2) schema.sql'deki 8 ornek urunu kaldir (yerlerine bu 50 urun geliyor)
-- ---------------------------------------------------------------------
delete from public.products
where serial_number in ('SW-CL-0001', 'SW-MO-0001', 'SW-SE-0001', 'SW-SU-0001', 'SW-MA-0001', 'SW-TO-0001', 'SW-SE-0002', 'SW-MO-0002');


-- ---------------------------------------------------------------------
-- 3) 50 urun
--    image_url = proje adresi + dosya adi. Proje adresi asagida TEK yerde
--    (proje degisirse sadece bu adres guncellenir).
-- ---------------------------------------------------------------------
insert into public.products
  (category_id, name, brand, model, serial_number, description, price, stock,
   warranty_status, distributor, skin_type, badges, emoji, image_url)
select c.id, v.name, v.brand, v.model, v.serial_number, v.description, v.price, v.stock,
       v.warranty_status, v.distributor, v.skin_type, v.badges, v.emoji,
       base.url || v.image_file
from (values
  ( 1, 'cleanser', 'Gentle Hydrating Cleanser', 'DermaPure', '236 ml', '8691001565715',
   'Creamy, non-foaming cleanser that removes makeup and impurities without stripping the skin barrier.',
   12.99, 42, 'Expires 2027-03-28 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Dry', array['Fragrance-free', 'Hydrating']::text[], '🫧', 'gentle-hydrating-cleanser.jpg'),
  ( 2, 'cleanser', 'Foaming Gel Cleanser', 'DermaPure', '236 ml', '8691002671385',
   'Light gel that foams gently to clear excess oil and impurities from the pores.',
   12.99, 35, 'Expires 2028-05-15 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Oily', array['Vegan', 'Fragrance-free', 'Acne care']::text[], '🫧', 'foaming-gel-cleanser.jpg'),
  ( 3, 'cleanser', 'Salicylic Acid Cleanser', 'ClearForm', '150 ml', '8691003664515',
   'Daily exfoliating cleanser that unclogs pores and helps reduce breakouts.',
   14.99, 0, 'Expires 2028-07-30 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Oily', array['Vegan', 'Fragrance-free', 'Acne care']::text[], '🫧', 'salicylic-acid-cleanser.jpg'),
  ( 4, 'cleanser', 'Micellar Cleansing Water', 'AquaVeil', '400 ml', '8691004213972',
   'No-rinse micellar water that lifts makeup and dirt in one step.',
   9.99, 60, 'Expires 2027-03-30 · 6 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'All', array['Vegan', 'Fragrance-free', 'Soothing']::text[], '🫧', 'micellar-cleansing-water.jpg'),
  ( 5, 'cleanser', 'Oat Cream Cleanser', 'Verdana Botanics', '150 ml', '8691005427026',
   'Soothing cream cleanser for reactive skin that leaves it soft and calm.',
   11.99, 18, 'Expires 2027-01-28 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Dry', array['Fragrance-free', 'Soothing']::text[], '🫧', 'oat-cream-cleanser.jpg'),
  ( 6, 'cleanser', 'Cleansing Balm', 'Lumière Lab', '100 ml', '8691006926177',
   'Melting balm that dissolves long-wear makeup and sunscreen, rinses to a milky emulsion.',
   18.99, 24, 'Expires 2028-11-30 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'All', array['Vegan', 'Hydrating']::text[], '🫧', 'cleansing-balm.jpg'),
  ( 7, 'cleanser', 'Rice Enzyme Powder Wash', 'Hanami Skin', '70 g', '8691007647255',
   'Water-activated powder that gently exfoliates for a smoother, brighter look.',
   15.99, 15, 'Expires 2027-10-28 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'Normal', array['Vegan', 'Fragrance-free', 'Brightening']::text[], '🫧', 'rice-enzyme-powder-wash.jpg'),
  ( 8, 'cleanser', 'Low-pH Morning Cleanser', 'Hanami Skin', '150 ml', '8691008148584',
   'Mild low-pH gel suitable for daily morning use.',
   10.99, 48, 'Expires 2027-08-30 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'All', array['Vegan', 'Fragrance-free', 'Soothing']::text[], '🫧', 'low-ph-morning-cleanser.jpg'),
  ( 9, 'cleanser', 'Charcoal Purifying Cleanser', 'ClearForm', '200 ml', '8691009766466',
   'Deep-cleansing gel that draws out impurities and mattifies oily skin.',
   11.99, 5, 'Expires 2027-06-28 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Oily', array['Vegan', 'Oil control']::text[], '🫧', 'charcoal-purifying-cleanser.jpg'),
  (10, 'toner', 'Glycolic Acid Toning Solution', 'Lumière Lab', '240 ml', '8692010378235',
   'Exfoliating toner that resurfaces skin and improves radiance; use in the evening.',
   16.99, 30, 'Expires 2027-11-15 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Normal', array['Vegan', 'Fragrance-free', 'Brightening']::text[], '🌸', 'glycolic-acid-toning-solution.jpg'),
  (11, 'toner', 'Hydrating Rose Toner', 'Verdana Botanics', '200 ml', '8692011759330',
   'Refreshing toner that preps the skin and adds a first layer of hydration.',
   11.99, 26, 'Expires 2027-06-30 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Dry', array['Vegan', 'Hydrating']::text[], '🌸', 'hydrating-rose-toner.jpg'),
  (12, 'toner', 'BHA Pore Refining Toner', 'ClearForm', '150 ml', '8692012820466',
   'Lightweight liquid exfoliant that targets pores and blackheads.',
   13.99, 22, 'Expires 2028-01-28 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Oily', array['Vegan', 'Fragrance-free']::text[], '🌸', 'bha-pore-refining-toner.jpg'),
  (13, 'toner', 'Centella Calming Toner', 'Hanami Skin', '200 ml', '8692013853548',
   'Alcohol-free toner that calms irritated skin and supports the barrier.',
   12.99, 0, 'Expires 2027-12-15 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'Sensitive', array['Vegan', 'Fragrance-free', 'Soothing']::text[], '🌸', 'centella-calming-toner.jpg'),
  (14, 'toner', 'Hyaluronic Essence Toner', 'AquaVeil', '150 ml', '8692014437242',
   'Watery essence that plumps and hydrates skin layer by layer.',
   14.99, 33, 'Expires 2028-07-30 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Dry', array['Vegan', 'Fragrance-free', 'Anti-aging']::text[], '🌸', 'hyaluronic-essence-toner.jpg'),
  (15, 'toner', 'Rice Brightening Toner', 'Hanami Skin', '150 ml', '8692015374348',
   'Milky toner that softens skin and brightens a dull complexion.',
   13.99, 19, 'Expires 2027-10-30 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'All', array['Vegan', 'Fragrance-free', 'Brightening']::text[], '🌸', 'rice-brightening-toner.jpg'),
  (16, 'toner', 'Green Tea Balancing Toner', 'Verdana Botanics', '200 ml', '8692016573092',
   'Balancing toner that controls shine and refreshes the skin.',
   10.99, 40, 'Expires 2028-05-15 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Combination', array['Vegan', 'Oil control']::text[], '🌸', 'green-tea-balancing-toner.jpg'),
  (17, 'toner', 'PHA Gentle Exfoliating Toner', 'DermaPure', '200 ml', '8692017945515',
   'Very mild exfoliating toner for sensitive skin that smooths without stinging.',
   15.99, 12, 'Expires 2027-08-15 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Sensitive', array['Fragrance-free', 'Soothing']::text[], '🌸', 'pha-gentle-exfoliating-toner.jpg'),
  (18, 'serum', 'Niacinamide 10% + Zinc 1%', 'ClearForm', '30 ml', '8693018251483',
   'Lightweight serum that reduces the look of blemishes and balances oil.',
   11.99, 55, 'Expires 2028-07-28 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Oily', array['Vegan', 'Fragrance-free', 'Acne care']::text[], '✨', 'niacinamide-10-plus-zinc-1.jpg'),
  (19, 'serum', 'Vitamin C 15% Serum', 'Lumière Lab', '30 ml', '8693019854454',
   'Antioxidant serum that brightens skin and fades the look of dark spots.',
   23.99, 20, 'Expires 2027-05-30 · 6 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Normal', array['Vegan', 'Fragrance-free', 'Dark-spot care']::text[], '✨', 'vitamin-c-15-serum.jpg'),
  (20, 'serum', 'Hyaluronic Acid 2% + B5', 'AquaVeil', '30 ml', '8693020641319',
   'Hydrating serum that holds moisture in the skin for a plump look.',
   12.99, 64, 'Expires 2028-02-28 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'All', array['Vegan', 'Fragrance-free', 'Hydrating']::text[], '✨', 'hyaluronic-acid-2-plus-b5.jpg'),
  (21, 'serum', 'Retinol 0.3% Night Serum', 'Lumière Lab', '30 ml', '8693021616965',
   'Beginner-friendly retinol serum for night use that smooths texture over time.',
   21.99, 14, 'Expires 2027-12-15 · 6 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Normal', array['Vegan', 'Fragrance-free', 'Anti-aging']::text[], '✨', 'retinol-03-night-serum.jpg'),
  (22, 'serum', 'Azelaic Acid 10% Booster', 'DermaPure', '30 ml', '8693022878058',
   'Gentle multitasking serum for redness, post-acne marks and uneven tone.',
   17.99, 0, 'Expires 2028-03-28 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Sensitive', array['Vegan', 'Fragrance-free', 'Acne care']::text[], '✨', 'azelaic-acid-10-booster.jpg'),
  (23, 'serum', 'Peptide Firming Serum', 'Lumière Lab', '30 ml', '8693023422816',
   'Peptide-rich serum that supports firmer, smoother-looking skin.',
   26.99, 9, 'Expires 2027-05-30 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Mature', array['Vegan', 'Fragrance-free', 'Anti-aging']::text[], '✨', 'peptide-firming-serum.jpg'),
  (24, 'serum', 'Snail Mucin Repair Essence', 'Hanami Skin', '100 ml', '8693024197157',
   'Lightweight essence that repairs and hydrates for a healthy glow.',
   16.99, 28, 'Expires 2027-06-30 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'Dry', array['Fragrance-free', 'Acne care']::text[], '✨', 'snail-mucin-repair-essence.jpg'),
  (25, 'serum', 'Alpha Arbutin 2% Serum', 'Verdana Botanics', '30 ml', '8693025316595',
   'Targeted serum that visibly reduces dark spots and hyperpigmentation.',
   13.99, 31, 'Expires 2027-03-28 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'All', array['Vegan', 'Fragrance-free', 'Dark-spot care']::text[], '✨', 'alpha-arbutin-2-serum.jpg'),
  (26, 'serum', 'Ceramide Barrier Serum', 'DermaPure', '30 ml', '8693026597849',
   'Barrier-restoring serum for compromised or over-exfoliated skin.',
   18.99, 17, 'Expires 2027-11-28 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Dry', array['Fragrance-free', 'Hydrating']::text[], '✨', 'ceramide-barrier-serum.jpg'),
  (27, 'moisturizer', 'Daily Moisturizing Lotion', 'DermaPure', '355 ml', '8694027581868',
   'Lightweight, oil-free lotion for all-day hydration on face and body.',
   13.99, 46, 'Expires 2027-06-30 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Normal', array['Fragrance-free', 'Hydrating']::text[], '💧', 'daily-moisturizing-lotion.jpg'),
  (28, 'moisturizer', 'Rich Barrier Cream', 'DermaPure', '50 ml', '8694028102048',
   'Nourishing cream that repairs the barrier and relieves tight, dry skin.',
   16.99, 23, 'Expires 2028-09-15 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Dry', array['Fragrance-free', 'Hydrating']::text[], '💧', 'rich-barrier-cream.jpg'),
  (29, 'moisturizer', 'Oil-Free Gel Cream', 'AquaVeil', '50 ml', '8694029338248',
   'Water-light gel cream that hydrates without shine or clogged pores.',
   14.99, 38, 'Expires 2028-12-28 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Oily', array['Vegan', 'Fragrance-free', 'Hydrating']::text[], '💧', 'oil-free-gel-cream.jpg'),
  (30, 'moisturizer', 'Cica Recovery Cream', 'Hanami Skin', '50 ml', '8694030684457',
   'Soothing cream that calms redness and supports skin recovery.',
   15.99, 0, 'Expires 2027-11-30 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'Sensitive', array['Vegan', 'Fragrance-free', 'Soothing']::text[], '💧', 'cica-recovery-cream.jpg'),
  (31, 'moisturizer', 'Squalane Night Cream', 'Lumière Lab', '50 ml', '8694031264269',
   'Rich overnight cream that nourishes and smooths while you sleep.',
   20.99, 16, 'Expires 2027-05-15 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Dry', array['Vegan', 'Fragrance-free', 'Anti-aging']::text[], '💧', 'squalane-night-cream.jpg'),
  (32, 'moisturizer', 'Mattifying Moisturizer', 'ClearForm', '50 ml', '8694032386045',
   'Light moisturizer that controls shine and blurs the look of pores.',
   13.99, 29, 'Expires 2027-09-30 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Oily', array['Vegan', 'Fragrance-free', 'Oil control']::text[], '💧', 'mattifying-moisturizer.jpg'),
  (33, 'moisturizer', 'Aloe Soothing Gel', 'Verdana Botanics', '250 ml', '8694033134478',
   'Cooling multi-use gel for face and body that soothes and refreshes.',
   8.99, 70, 'Expires 2028-07-30 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'All', array['Vegan', 'Soothing']::text[], '💧', 'aloe-soothing-gel.jpg'),
  (34, 'moisturizer', 'Vitamin E Nourishing Cream', 'Verdana Botanics', '50 ml', '8694034983716',
   'Comforting cream with antioxidant vitamin E for soft, supple skin.',
   12.99, 4, 'Expires 2027-06-15 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Dry', array['Vegan', 'Hydrating']::text[], '💧', 'vitamin-e-nourishing-cream.jpg'),
  (35, 'sunscreen', 'Invisible Fluid SPF 50+', 'Solea', '50 ml', '8695035336228',
   'Ultra-light fluid with very high protection that leaves no white cast.',
   18.99, 52, 'Expires 2027-02-28 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'All', array['Vegan', 'Fragrance-free', 'Sun protection']::text[], '☀️', 'invisible-fluid-spf-50plus.jpg'),
  (36, 'sunscreen', 'Mineral Sunscreen SPF 30', 'Solea', '50 ml', '8695036974146',
   '100% mineral sunscreen for reactive skin; gentle and fragrance-free.',
   16.99, 21, 'Expires 2027-05-28 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Sensitive', array['Vegan', 'Fragrance-free', 'Soothing']::text[], '☀️', 'mineral-sunscreen-spf-30.jpg'),
  (37, 'sunscreen', 'Tinted Sunscreen SPF 50', 'Solea', '40 ml', '8695037455934',
   'Sheer tinted protection that evens skin tone like a light foundation.',
   19.99, 0, 'Expires 2028-02-28 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Normal', array['Vegan', 'Fragrance-free', 'Sun protection']::text[], '☀️', 'tinted-sunscreen-spf-50.jpg'),
  (38, 'sunscreen', 'Oil Control Sun Gel SPF 50', 'ClearForm', '50 ml', '8695038534881',
   'Matte-finish sun gel that keeps oily skin shine-free all day.',
   15.99, 34, 'Expires 2027-09-30 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Oily', array['Vegan', 'Fragrance-free', 'Oil control']::text[], '☀️', 'oil-control-sun-gel-spf-50.jpg'),
  (39, 'sunscreen', 'Hydrating Sun Cream SPF 50+', 'AquaVeil', '50 ml', '8695039577993',
   'Moisturizing sun cream that protects and hydrates in one step.',
   16.99, 27, 'Expires 2027-02-28 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Dry', array['Vegan', 'Fragrance-free', 'Hydrating']::text[], '☀️', 'hydrating-sun-cream-spf-50plus.jpg'),
  (40, 'sunscreen', 'Rice Probiotic Sun Essence SPF 50', 'Hanami Skin', '50 ml', '8695040896687',
   'Lightweight essence-texture sunscreen with a natural glow finish.',
   14.99, 41, 'Expires 2028-02-28 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'All', array['Vegan', 'Fragrance-free', 'Brightening']::text[], '☀️', 'rice-probiotic-sun-essence-spf-50.jpg'),
  (41, 'sunscreen', 'Body Sun Spray SPF 30', 'Solea', '200 ml', '8695041327654',
   'Easy-spray body protection that absorbs quickly; water resistant.',
   17.99, 13, 'Expires 2028-10-15 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'All', array['Vegan', 'Sun protection']::text[], '☀️', 'body-sun-spray-spf-30.jpg'),
  (42, 'sunscreen', 'Sun Stick SPF 50', 'Solea', '15 g', '8695042134770',
   'Portable stick for easy reapplication over makeup and on the go.',
   12.99, 8, 'Expires 2027-08-30 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'All', array['Vegan', 'Fragrance-free', 'Sun protection']::text[], '☀️', 'sun-stick-spf-50.jpg'),
  (43, 'mask', 'Kaolin Clay Mask', 'ClearForm', '75 ml', '8696043598813',
   'Purifying clay mask that absorbs oil and refines pores in 10 minutes.',
   12.99, 25, 'Expires 2027-05-28 · 12 months after opening',
   'Anka Güzellik Ürünleri A.Ş. (Çankaya, Ankara · +90 312 000 30 30 · satis@ankaguzellik.example)', 'Oily', array['Vegan', 'Oil control']::text[], '🌿', 'kaolin-clay-mask.jpg'),
  (44, 'mask', 'Overnight Hydrating Mask', 'AquaVeil', '75 ml', '8696044486935',
   'Sleeping mask that locks in moisture overnight for plump skin by morning.',
   14.99, 30, 'Expires 2027-12-15 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Dry', array['Vegan', 'Fragrance-free', 'Hydrating']::text[], '🌿', 'overnight-hydrating-mask.jpg'),
  (45, 'mask', 'AHA/BHA Peeling Mask', 'Lumière Lab', '30 ml', '8696045720922',
   '10-minute weekly peeling mask for smoother, brighter skin; not for sensitive skin.',
   13.99, 0, 'Expires 2027-02-28 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Normal', array['Vegan', 'Fragrance-free', 'Brightening']::text[], '🌿', 'aha-bha-peeling-mask.jpg'),
  (46, 'mask', 'Honey Nourishing Mask', 'Verdana Botanics', '100 ml', '8696046238624',
   'Rich, comforting mask that nourishes and soothes dry skin.',
   11.99, 19, 'Expires 2027-04-15 · 12 months after opening',
   'Ege Dermo Pazarlama Ltd. (Bornova, İzmir · +90 232 000 20 20 · info@egedermo.example)', 'Dry', array['Fragrance-free', 'Hydrating']::text[], '🌿', 'honey-nourishing-mask.jpg'),
  (47, 'mask', 'Sheet Mask Set (5 pcs)', 'Hanami Skin', '5 x 25 ml', '8696047844237',
   'Five single-use sheet masks for an instant hydration and glow boost.',
   9.99, 58, 'Expires 2027-03-30 · Single use',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'All', array['Vegan', 'Fragrance-free', 'Hydrating']::text[], '🌿', 'sheet-mask-set-5-pcs.jpg'),
  (48, 'mask', 'Caffeine Eye Cream', 'DermaPure', '15 ml', '8696048101759',
   'Light eye cream that reduces the look of puffiness and dark circles.',
   14.99, 22, 'Expires 2028-11-15 · 12 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'All', array['Vegan', 'Fragrance-free', 'Eye care']::text[], '🌿', 'caffeine-eye-cream.jpg'),
  (49, 'mask', 'Retinal Eye Serum', 'Lumière Lab', '15 ml', '8696049370611',
   'Gentle retinal serum for the eye area that targets fine lines.',
   19.99, 11, 'Expires 2027-10-28 · 6 months after opening',
   'Nur Kozmetik Dağıtım A.Ş. (Ataşehir, İstanbul · +90 216 000 10 10 · siparis@nurkozmetik.example)', 'Normal', array['Vegan', 'Fragrance-free', 'Anti-aging']::text[], '🌿', 'retinal-eye-serum.jpg'),
  (50, 'mask', 'Lip Sleeping Mask', 'Hanami Skin', '20 g', '8696050303660',
   'Overnight lip mask that softens and repairs dry, chapped lips.',
   8.99, 44, 'Expires 2028-07-15 · 12 months after opening',
   'Seul Beauty İthalat Ltd. (Şişli, İstanbul · +90 212 000 40 40 · orders@seulbeauty.example)', 'All', array['Vegan']::text[], '🌿', 'lip-sleeping-mask.jpg')
) as v (sort_order, category_slug, name, brand, model, serial_number, description, price, stock,
        warranty_status, distributor, skin_type, badges, emoji, image_file)
join public.categories c on c.slug = v.category_slug
cross join (select 'https://mdiqahixmalufaeekixm.supabase.co/storage/v1/object/public/product-images/'::text as url) as base
order by v.sort_order
on conflict (serial_number) do nothing;


-- ---------------------------------------------------------------------
-- 4) Kontrol: 50 urun ve kategori dagilimi
-- ---------------------------------------------------------------------
select c.name as category, count(p.id) as products, sum((p.stock = 0)::int) as sold_out
from public.categories c
left join public.products p on p.category_id = c.id
group by c.name
order by c.name;
